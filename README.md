
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
