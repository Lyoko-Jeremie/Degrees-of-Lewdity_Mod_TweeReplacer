
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
