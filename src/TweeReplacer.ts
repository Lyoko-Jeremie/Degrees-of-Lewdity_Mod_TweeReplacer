import type {AddonPluginHookPointEx} from "../../../dist-BeforeSC2/AddonPlugin";
import type {LogWrapper} from "../../../dist-BeforeSC2/ModLoadController";
import type {ModBootJsonAddonPlugin, ModInfo} from "../../../dist-BeforeSC2/ModLoader";
import type {ModZipReader} from "../../../dist-BeforeSC2/ModZipReader";
import type {SC2DataInfo} from "../../../dist-BeforeSC2/SC2DataInfoCache";
import type {SC2DataManager} from "../../../dist-BeforeSC2/SC2DataManager";
import type {ModUtils} from "../../../dist-BeforeSC2/Utils";
import type {
    TweeReplacerLinkerInterface,
    TweeReplacerLinkerClientInterface,
    TweeReplacerLinkerClientCallbackType,
} from "../../TweeReplacerLinker/dist/TweeReplacerLinkerInterface";
import {every, isArray, isNil, isString} from "lodash";
import JSON5 from 'json5';

interface ReplaceInfo {
    addonName: string;
    mod: ModInfo;
    modZip: ModZipReader;
}

export interface ReplaceParams {
    passage: string;
    findString?: string;
    findRegex?: string;
    replace?: string;
    replaceFile?: string;
    debug?: boolean;
    // replace all , otherwise only first one
    all?: boolean;
}

export function isReplaceParams(p: any): p is ReplaceParams {
    return p
        && typeof p === 'object'
        && typeof p.passage === 'string'
        && (typeof p.findString === 'string' || typeof p.findRegex === 'string')
        && (typeof p.replace === 'string' || typeof p.replaceFile === 'string')
        && (isNil(p.debug) || typeof p.debug === 'boolean')
        ;
}

export interface ModBootJsonAddonPluginTweeReplacer extends ModBootJsonAddonPlugin {
    paramsFiles?: string[];
}

export class TweeReplacer implements AddonPluginHookPointEx, TweeReplacerLinkerClientInterface {
    private logger: LogWrapper;

    nowModName!: string;

    constructor(
        public gSC2DataManager: SC2DataManager,
        public gModUtils: ModUtils,
    ) {
        this.logger = gModUtils.getLogger();
        this.gModUtils.getAddonPluginManager().registerAddonPlugin(
            'TweeReplacer',
            'TweeReplacerAddon',
            this,
        );
        const theName = this.gModUtils.getNowRunningModName();
        if (!theName) {
            console.error('[TweeReplacer] init() (!theName).', [theName]);
            this.logger.error(`[TweeReplacer] init() [${theName}].`);
            return;
        }
        this.nowModName = theName;
        const mod = this.gModUtils.getMod(theName);
        if (!mod) {
            console.error('[TweeReplacer] init() (!mod). ', [theName]);
            this.logger.error(`[TweeReplacer] init() (!mod). [${theName}].`);
            return;
        }
        console.log('[TweeReplacer] register modRef done.', [theName]);
        this.logger.log(`[TweeReplacer] register modRef done. [${theName}].`);
        mod.modRef = this;
    }

    isLinkerMode = false;

    async enableLinkerMode(): Promise<boolean> {
        console.log(`[TweeReplacer] now enableLinkerMode`);
        this.logger.log(`[TweeReplacer] now enableLinkerMode`);
        this.isLinkerMode = true;
        return true;
    }

    linkerModRef: undefined | TweeReplacerLinkerInterface;

    async afterEarlyLoad() {
        // register to linker
        const linkerMod = this.gModUtils.getMod('TweeReplacerLinker');
        if (!linkerMod) {
            console.warn('[TweeReplacer] afterEarlyLoad() cannot find TweeReplacerLinker, now running in standalone mode.');
            this.logger.warn('[TweeReplacer] afterEarlyLoad() cannot find TweeReplacerLinker, now running in standalone mode.');
            return;
        }
        if (!linkerMod.modRef?.registerClient) {
            console.error('[TweeReplacer] afterEarlyLoad() cannot find TweeReplacerLinker.registerClient(), linker invalid. now running in standalone mode.');
            this.logger.error('[TweeReplacer] afterEarlyLoad() cannot find TweeReplacerLinker.registerClient(), linker invalid. now running in standalone mode.');
            return;
        }
        if (!linkerMod.modRef?.addUserMod) {
            console.error('[TweeReplacer] afterEarlyLoad() cannot find TweeReplacerLinker.addUserMod(), linker invalid. now running in standalone mode.');
            this.logger.error('[TweeReplacer] afterEarlyLoad() cannot find TweeReplacerLinker.addUserMod(), linker invalid. now running in standalone mode.');
            return;
        }
        if (!await linkerMod.modRef.registerClient(this)) {
            console.error('[TweeReplacer] afterEarlyLoad() TweeReplacerLinker.registerClient() failed. now running in standalone mode.');
            this.logger.error('[TweeReplacer] afterEarlyLoad() TweeReplacerLinker.registerClient() failed. now running in standalone mode.');
            return;
        }
        this.linkerModRef = linkerMod.modRef as TweeReplacerLinkerInterface;
    }

    info: Map<string, ReplaceInfo> = new Map<string, ReplaceInfo>();

    async registerMod(addonName: string, mod: ModInfo, modZip: ModZipReader) {
        this.info.set(mod.name, {
            addonName,
            mod,
            modZip,
        });
        if (this.isLinkerMode) {
            if (!this.linkerModRef) {
                // state invalid
                console.error('[TweeReplacer] registerMod() (!this.linkerModRef).');
                this.logger.error('[TweeReplacer] registerMod() (!this.linkerModRef).');
                this.isLinkerMode = false;
                return;
            }
            if (!this.linkerModRef.addUserMod(
                this.nowModName,
                mod.name,
                async (sc: SC2DataInfo) => {
                    await this.do_patch(this.info.get(mod.name)!, sc);
                },
            )) {
                console.error('[TweeReplacer] registerMod() addUserMod() failed.', [this.nowModName, mod.name, mod]);
                this.logger.error(`[TweeReplacer] registerMod() addUserMod() failed. [${this.nowModName}] [${mod.name}]`);
                // this.isLinkerMode = false;
                return;
            }
        }
    }

    async afterPatchModToGame() {
        if (this.isLinkerMode) {
            // this is provided to linker
            return;
        }
        const scOld = this.gSC2DataManager.getSC2DataInfoAfterPatch();
        const sc = scOld.cloneSC2DataInfo();
        for (const [name, ri] of this.info) {
            try {
                await this.do_patch(ri, sc);
            } catch (e: any | Error) {
                console.error(e);
                this.logger.error(`[TweeReplacer]: ${name} ${e?.message ? e.message : e}`);
            }
        }
        sc.passageDataItems.back2Array();
        this.gModUtils.replaceFollowSC2DataInfo(sc, scOld);
    }

    async do_patch(ri: ReplaceInfo, sc: SC2DataInfo) {
        const ad = ri.mod.bootJson.addonPlugin?.find((T: ModBootJsonAddonPlugin) => {
            return T.modName === 'TweeReplacer'
                && T.addonName === 'TweeReplacerAddon';
        }) as ModBootJsonAddonPluginTweeReplacer | undefined;
        if (!ad) {
            // never go there
            console.error('[TweeReplacer] do_patch() (!ad).', [ri.mod]);
            return;
        }
        let params = ad.params as ReplaceParams[];
        if (!isArray(params) || !every<ReplaceParams>(params, isReplaceParams)) {
            console.error('[TweeReplacer] do_patch() (!params).', [ri.mod]);
            this.logger.error(`[TweeReplacer] do_patch() invalid params: ${ri.mod.name}`);
            return;
        }
        if (ad.paramsFiles && isArray(ad.paramsFiles) && every(ad.paramsFiles, isString)) {
            for (const f of ad.paramsFiles) {
                const ff = ri.modZip.zip.file(f);
                const rf = await ff?.async('string');
                if (!rf) {
                    console.error('[TweeReplacer] do_patch() (!rf).', [ri.mod, f, rf]);
                    this.logger.error(`[TweeReplacer] do_patch() cannot find paramsFile: [${ri.mod.name}] [${f}]`);
                    continue;
                }
                try {
                    const p = JSON5.parse(rf);
                    if (!isArray(p) || !every<ReplaceParams>(p, isReplaceParams)) {
                        console.error('[TweeReplacer] do_patch() (!paramsFile).', [ri.mod, f, rf]);
                        this.logger.error(`[TweeReplacer] do_patch() invalid paramsFile: [${ri.mod.name}] [${f}]. skip`);
                        continue;
                    }
                    params = params.concat(p);
                } catch (e) {
                    console.error('[TweeReplacer] do_patch() JSON5.parse(rf) failed.', [ri.mod, f, rf]);
                    this.logger.error(`[TweeReplacer] do_patch() JSON5.parse(rf) failed: [${ri.mod.name}] [${f}]`);
                    continue;
                }
            }
        }
        let okCount = 0;
        let errorCount = 0;
        for (const p of params) {

            if (!isReplaceParams(p)) {
                console.error('[TweeReplacer] do_patch() (!this.checkParams(p)).', [ri.mod, p]);
                this.logger.error(`[TweeReplacer] do_patch() invalid params p: [${ri.mod.name}] [${JSON.stringify(p)}]`);
                ++errorCount;
                continue;
            }

            // falsy value will be false
            const debugFlag = !!p.debug;

            const replaceEvery = !!p.all;

            const pp = sc.passageDataItems.map.get(p.passage);
            if (!pp) {
                console.error('[TweeReplacer] do_patch() (!pp).', [ri.mod, p]);
                this.logger.error(`[TweeReplacer] do_patch() cannot find passage: [${ri.mod.name}] [${p.passage}]`);
                ++errorCount;
                continue;
            }
            let replaceString = p.replace;
            if (!replaceString) {
                const f = ri.modZip.zip.file(p.replaceFile!);
                const rf = await f?.async('string');
                if (!rf) {
                    console.error('[TweeReplacer] do_patch() (!rf).', [ri.mod, p]);
                    this.logger.error(`[TweeReplacer] do_patch() cannot find replaceFile: [${ri.mod.name}] [${p.replaceFile}]`);
                    ++errorCount;
                    continue;
                }
                replaceString = rf;
            }
            if (p.findString) {
                if (pp.content.indexOf(p.findString) < 0) {
                    console.error('[TweeReplacer] do_patch() (pp.content.search(p.findString) < 0).', [ri.mod, p]);
                    this.logger.error(`[TweeReplacer] do_patch() cannot find findString: [${ri.mod.name}] findString:[${p.findString}] in:[${pp.name}]`);
                    ++errorCount;
                    continue;
                }
                if (debugFlag) {
                    console.log(`[TweeReplacer] findString :`, p.findString);
                    console.log(`[TweeReplacer] Before:`, pp.content);
                }
                if (replaceEvery) {
                    pp.content = pp.content.replaceAll(p.findString, replaceString);
                } else {
                    pp.content = pp.content.replace(p.findString, replaceString);
                }
                if (debugFlag) {
                    console.log(`[TweeReplacer] After:`, pp.content);
                }
            } else if (p.findRegex) {
                if (pp.content.search(new RegExp(p.findRegex)) < 0) {
                    console.error('[TweeReplacer] do_patch() (pp.content.search(p.findRegex) < 0).', [ri.mod, p]);
                    this.logger.error(`[TweeReplacer] do_patch() cannot find findRegex: [${ri.mod.name}] findRegex:[${p.findRegex}] in:[${pp.name}]`);
                    ++errorCount;
                    continue;
                }
                if (debugFlag) {
                    console.log(`[TweeReplacer] findRegex :`, p.findRegex);
                    console.log(`[TweeReplacer] Before:`, pp.content);
                }
                if (replaceEvery) {
                    pp.content = pp.content.replaceAll(new RegExp(p.findRegex), replaceString);
                } else {
                    pp.content = pp.content.replace(new RegExp(p.findRegex), replaceString);
                }
                if (debugFlag) {
                    console.log(`[TweeReplacer] After:`, pp.content);
                }
            } else {
                console.error('[TweeReplacer] do_patch() (!p.findString && !p.findRegex).', [ri.mod, p]);
                this.logger.error(`[TweeReplacer] do_patch() invalid findString and findRegex: [${ri.mod.name}] [${p.findString}] [${p.findRegex}]`);
                ++errorCount;
                continue;
            }
            console.log('[TweeReplacer] do_patch() done.', [ri.mod, p]);
            ++okCount;
            // this.logger.log(`[TweeReplacer] do_patch() done: [${ri.mod.name}] [${p.passage}] [${p.findString || ''}]/[${p.findRegex || ''}]`);
        }
        if (errorCount === 0) {
            this.logger.log(`[TweeReplacer] do_patch() done: [${ri.mod.name}] okCount:[${okCount}] errorCount:[${errorCount}]`);
        } else {
            this.logger.error(`[TweeReplacer] do_patch() done: [${ri.mod.name}] okCount:[${okCount}] errorCount:[${errorCount}]`);
        }
    }

    init() {
    }
}
