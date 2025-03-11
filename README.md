# Readme

This extension will remotely configurable messages next to imports in your code. It is meant for usage within a organization or group where a central team can manage which imports should have additional info displayed. The extension is dependent on a json file that is hosted on a server.

## Extension Settings

You have to define which URL to fetch the json from. The extension will ask for this on it's first run. This can also be configured in your settings.json file. The key is `customImportInformation.jsonUrl` and the value is the URL to the json file.

```json
{
    "customImportInformation.jsonUrl": "https://example.com/custom_information.json"
}
```

## JSON format

```json
{
    "customImportInformationItems": {
        "previously-used-package-name": {
            "message": "We have switched to https://www.npmjs.com/package/packagename"
        }
    }
}
```

This will detect the import `import { something } from 'previously-used-package-name'` and display the message `We have switched to https://www.npmjs.com/package/packagename` next to it.

## License

Creative Commons Attribution ShareAlike 4.0 International (CC BY-SA 4.0)

## Known Issues

None.

## Release Notes

### 1.0.1

Security fix

### 1.0.0

Initial release
