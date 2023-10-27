import type {AddonPluginHookPointEx} from "../../../dist-BeforeSC2/AddonPlugin";
import type {LogWrapper} from "../../../dist-BeforeSC2/ModLoadController";
import type {ModBootJsonAddonPlugin, ModInfo} from "../../../dist-BeforeSC2/ModLoader";
import type {ModZipReader} from "../../../dist-BeforeSC2/ModZipReader";
import type {SC2DataInfo} from "../../../dist-BeforeSC2/SC2DataInfoCache";
import type {SC2DataManager} from "../../../dist-BeforeSC2/SC2DataManager";
import type {ModUtils} from "../../../dist-BeforeSC2/Utils";
import {isNil} from "lodash";

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

export class TweeReplacer implements AddonPluginHookPointEx {
    private log: LogWrapper;

    constructor(
        public gSC2DataManager: SC2DataManager,
        public gModUtils: ModUtils,
    ) {
        this.log = gModUtils.getLogger();
    }

    info: Map<string, ReplaceInfo> = new Map<string, ReplaceInfo>();

    async registerMod(addonName: string, mod: ModInfo, modZip: ModZipReader) {
        this.info.set(mod.name, {
            addonName,
            mod,
            modZip,
        });
    }

    async afterPatchModToGame() {
        const scOld = this.gSC2DataManager.getSC2DataInfoAfterPatch();
        const sc = scOld.cloneSC2DataInfo();
        for (const [name, ri] of this.info) {
            try {
                await this.do_patch(ri, sc);
            } catch (e: any | Error) {
                console.error(e);
                this.log.error(`TweeReplacer: ${name} ${e?.message ? e.message : e}`);
            }
        }
        sc.passageDataItems.back2Array();
        this.gModUtils.replaceFollowSC2DataInfo(sc, scOld);
    }

    checkParams(p: any): p is ReplaceParams {
        return p
            && typeof p === 'object'
            && typeof p.passage === 'string'
            && (typeof p.findString === 'string' || typeof p.findRegex === 'string')
            && (typeof p.replace === 'string' || typeof p.replaceFile === 'string')
            && (isNil(p.debug) || typeof p.debug === 'boolean')
            ;
    }

    async do_patch(ri: ReplaceInfo, sc: SC2DataInfo) {
        const ad = ri.mod.bootJson.addonPlugin?.find((T: ModBootJsonAddonPlugin) => {
            return T.modName === 'TweeReplacer'
                && T.addonName === 'TweeReplacerAddon';
        });
        if (!ad) {
            // never go there
            console.error('TweeReplacer do_patch() (!ad).', [ri.mod]);
            return;
        }
        const params = ad.params;
        if (!params || !Array.isArray(params)) {
            console.error('TweeReplacer do_patch() (!params).', [ri.mod]);
            this.log.error(`TweeReplacer do_patch() invalid params: ${ri.mod.name}`);
            return;
        }
        for (const p of params) {

            if (!this.checkParams(p)) {
                console.error('TweeReplacer do_patch() (!this.checkParams(p)).', [ri.mod, p]);
                this.log.error(`TweeReplacer do_patch() invalid params p: [${ri.mod.name}] [${JSON.stringify(p)}]`);
                continue;
            }

            // falsy value will be false
            const debugFlag = !!p.debug;

            const replaceEvery = !!p.all;

            const pp = sc.passageDataItems.map.get(p.passage);
            if (!pp) {
                console.error('TweeReplacer do_patch() (!pp).', [ri.mod, p]);
                this.log.error(`TweeReplacer do_patch() cannot find passage: [${ri.mod.name}] [${p.passage}]`);
                continue;
            }
            let replaceString = p.replace;
            if (!replaceString) {
                const f = ri.modZip.zip.file(p.replaceFile!);
                const rf = await f?.async('string');
                if (!rf) {
                    console.error('TweeReplacer do_patch() (!rf).', [ri.mod, p]);
                    this.log.error(`TweeReplacer do_patch() cannot find replaceFile: [${ri.mod.name}] [${p.replaceFile}]`);
                    continue;
                }
                replaceString = rf;
            }
            if (p.findString) {
                if (pp.content.indexOf(p.findString) < 0) {
                    console.error('TweeReplacer do_patch() (pp.content.search(p.findString) < 0).', [ri.mod, p]);
                    this.log.error(`TweeReplacer do_patch() cannot find findString: [${ri.mod.name}] findString:[${p.findString}] in:[${pp.name}]`);
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
                    console.error('TweeReplacer do_patch() (pp.content.search(p.findRegex) < 0).', [ri.mod, p]);
                    this.log.error(`TweeReplacer do_patch() cannot find findRegex: [${ri.mod.name}] findRegex:[${p.findRegex}] in:[${pp.name}]`);
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
                console.error('TweeReplacer do_patch() (!p.findString && !p.findRegex).', [ri.mod, p]);
                this.log.error(`TweeReplacer do_patch() invalid findString and findRegex: [${ri.mod.name}] [${p.findString}] [${p.findRegex}]`);
                continue;
            }
            console.log('TweeReplacer do_patch() done.', [ri.mod, p]);
            this.log.log(`TweeReplacer do_patch() done: [${ri.mod.name}] [${p.passage}] [${p.findString || ''}]/[${p.findRegex || ''}]`);
        }
    }

    init() {
        this.gModUtils.getAddonPluginManager().registerAddonPlugin(
            'TweeReplacer',
            'TweeReplacerAddon',
            this,
        );
    }
}
