
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
      "modVersion": "1.0.0",
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
          //When setting debug to true, the replacement operation corresponding to this parameter will be output to the Console.
          "debug": true
        },
      ]
    }
  ],
  "dependenceInfo": [
    {
      "modName": "ModLoader",
      "version": "^1.2.2"
    },
    {
      "modName": "TweeReplacer",
      "version": "^1.0.0"
    }
  ]
}
```
