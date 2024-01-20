# TweeReplacer

---

this mod export addon:

`TweeReplacer` : `TweeReplacerAddon`

```json lines
{
  "addonPlugin": [
    {
      "modName": "TweeReplacer",
      "addonName": "TweeReplacerAddon",
      "modVersion": "^1.2.0",
      "params": [
        {
          // which passage to replace
          "passage": "",
          // find string, string/regex
          "findString": "",
          "findRegex": "",
          // replace content, string/filePathInZip
          "replace": "",
          "replaceFile": "",
          // When setting debug to true, the replacement operation corresponding to this parameter will be output to the Console.
          "debug": true,
          // if you want to replace all, set this to true, otherwise only replace the first one.
          "all": true
        },
      ]
    }
  ],
  "dependenceInfo": [
    {
      "modName": "TweeReplacer",
      "version": "^1.2.0"
    }
  ]
}
```

---

# new mode: the outside file mode

```json lines
{
  "additionFile": [
    // don't forgot add `paramsFiles` file to `additionFile` if you use `packModZip` tools
    "path/to/paramsFileA.json5",
    "path/to/paramsFileB.json5"
  ],
  "addonPlugin": [
    {
      "modName": "TweeReplacer",
      "addonName": "TweeReplacerAddon",
      // the `paramsFiles` mode start from `1.6.0`
      "modVersion": "^1.6.0",
      "paramsFiles": [
        // you can place multiple files here, and the parameters in these files will be merged into the parameters of the addon.
        "path/to/paramsFileA.json5",
        "path/to/paramsFileB.json5"
      ],
      "params": [
        // when use the `paramsFiles` , can leave this as empty array
        {
          // which passage to replace
          "passage": "",
          // find string, string/regex
          "findString": "",
          "findRegex": "",
          // replace content, string/filePathInZip
          "replace": "",
          "replaceFile": "",
          // When setting debug to true, the replacement operation corresponding to this parameter will be output to the Console.
          "debug": true,
          // if you want to replace all, set this to true, otherwise only replace the first one.
          "all": true
        },
      ]
    }
  ],
  "dependenceInfo": [
    {
      "modName": "TweeReplacer",
      // the `paramsFiles` mode start from `1.6.0`
      "version": "^1.6.0"
    }
  ]
}
```

the `paramsFiles` file:

```json5
[
   // same as the `params` in the addon
   {
     // which passage to replace
     "passage": "",
     // find string, string/regex
     "findString": "",
     "findRegex": "",
     // replace content, string/filePathInZip
     "replace": "",
     "replaceFile": "",
     // When setting debug to true, the replacement operation corresponding to this parameter will be output to the Console.
     "debug": true,
     // if you want to replace all, set this to true, otherwise only replace the first one.
     "all": true
   },
]
```

multi `paramsFiles` will be merged into one array, and then merged into the `params` in the addon.
