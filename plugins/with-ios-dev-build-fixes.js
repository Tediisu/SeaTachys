const { withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const PODFILE_MARKER = '# @generated begin with-ios-dev-build-fixes';
const PBXPROJ_OLD_SCRIPT = String.raw`if [[ -f "$PODS_ROOT/../.xcode.env" ]]; then
  source "$PODS_ROOT/../.xcode.env"
fi
if [[ -f "$PODS_ROOT/../.xcode.env.local" ]]; then
  source "$PODS_ROOT/../.xcode.env.local"
fi

# The project root by default is one level up from the ios directory
export PROJECT_ROOT="$PROJECT_DIR"/..

if [[ "$CONFIGURATION" = *Debug* ]]; then
  export SKIP_BUNDLING=1
fi
if [[ -z "$ENTRY_FILE" ]]; then
  # Set the entry JS file using the bundler's entry resolution.
  export ENTRY_FILE="$("$NODE_BINARY" -e "require('expo/scripts/resolveAppEntry')" "$PROJECT_ROOT" ios absolute | tail -n 1)"
fi

if [[ -z "$CLI_PATH" ]]; then
  # Use Expo CLI
  export CLI_PATH="$("$NODE_BINARY" --print "require.resolve('@expo/cli', { paths: [require.resolve('expo/package.json')] })")"
fi
if [[ -z "$BUNDLE_COMMAND" ]]; then
  # Default Expo CLI command for bundling
  export BUNDLE_COMMAND="export:embed"
fi

# Source .xcode.env.updates if it exists to allow
# SKIP_BUNDLING to be unset if needed
if [[ -f "$PODS_ROOT/../.xcode.env.updates" ]]; then
  source "$PODS_ROOT/../.xcode.env.updates"
fi
# Source local changes to allow overrides
# if needed
if [[ -f "$PODS_ROOT/../.xcode.env.local" ]]; then
  source "$PODS_ROOT/../.xcode.env.local"
fi

` + "`" + String.raw`"$NODE_BINARY" --print "require('path').dirname(require.resolve('react-native/package.json')) + '/scripts/react-native-xcode.sh'"` + "`";

const PBXPROJ_NEW_SCRIPT = String.raw`if [[ -f "$PODS_ROOT/../.xcode.env" ]]; then
  source "$PODS_ROOT/../.xcode.env"
fi
if [[ -f "$PODS_ROOT/../.xcode.env.local" ]]; then
  source "$PODS_ROOT/../.xcode.env.local"
fi

# The project root by default is one level up from the ios directory
export PROJECT_ROOT="$PROJECT_DIR"/..

if [[ "$CONFIGURATION" = *Debug* ]]; then
  export SKIP_BUNDLING=1
fi
if [[ -z "$ENTRY_FILE" ]]; then
  # Set the entry JS file using the bundler's entry resolution.
  export ENTRY_FILE="$("$NODE_BINARY" -e "require('expo/scripts/resolveAppEntry')" "$PROJECT_ROOT" ios absolute | tail -n 1)"
fi

if [[ -z "$CLI_PATH" ]]; then
  # Use Expo CLI
  export CLI_PATH="$("$NODE_BINARY" --print "require.resolve('@expo/cli', { paths: [require.resolve('expo/package.json')] })")"
fi
if [[ -z "$BUNDLE_COMMAND" ]]; then
  # Default Expo CLI command for bundling
  export BUNDLE_COMMAND="export:embed"
fi

# Source .xcode.env.updates if it exists to allow
# SKIP_BUNDLING to be unset if needed
if [[ -f "$PODS_ROOT/../.xcode.env.updates" ]]; then
  source "$PODS_ROOT/../.xcode.env.updates"
fi
# Source local changes to allow overrides
# if needed
if [[ -f "$PODS_ROOT/../.xcode.env.local" ]]; then
  source "$PODS_ROOT/../.xcode.env.local"
fi

RN_XCODE_SCRIPT="$($NODE_BINARY --print "require('path').dirname(require.resolve('react-native/package.json')) + '/scripts/react-native-xcode.sh'")"
if [[ -z "$RN_XCODE_SCRIPT" ]]; then
  echo "Unable to resolve react-native-xcode.sh"
  exit 1
fi
bash "$RN_XCODE_SCRIPT"`;

function patchPodfileContents(contents) {
  if (contents.includes(PODFILE_MARKER)) {
    return contents;
  }

  const needle = `  post_install do |installer|
    react_native_post_install(
      installer,
      config[:reactNativePath],
      :mac_catalyst_enabled => false,
      :ccache_enabled => ccache_enabled?(podfile_properties),
    )
  end
end
`;

  const replacement = `  post_install do |installer|
    react_native_post_install(
      installer,
      config[:reactNativePath],
      :mac_catalyst_enabled => false,
      :ccache_enabled => ccache_enabled?(podfile_properties),
    )

    ${PODFILE_MARKER}
    fmt_header = File.join(installer.sandbox.root.to_s, 'fmt', 'include', 'fmt', 'base.h')
    if File.exist?(fmt_header)
      original = File.read(fmt_header)
      patched = original.gsub(/^#\\s*define\\s+FMT_USE_CONSTEVAL\\s+1$/, '#define FMT_USE_CONSTEVAL 0')
      File.write(fmt_header, patched) if patched != original
    end

    exconstants_target = installer.pods_project.targets.find { |target| target.name == 'EXConstants' }
    if exconstants_target
      exconstants_target.shell_script_build_phases.each do |phase|
        next unless phase.name == '[CP-User] Generate app.config for prebuilt Constants.manifest'

        phase.shell_script = 'bash -l -c "\\"$PODS_TARGET_SRCROOT/../scripts/get-app-config-ios.sh\\""'
      end
    end
    # @generated end with-ios-dev-build-fixes
  end
end
`;

  if (!contents.includes(needle)) {
    throw new Error('Unable to find Podfile post_install block to patch.');
  }

  return contents.replace(needle, replacement);
}

function patchPbxprojContents(contents) {
  if (contents.includes(PBXPROJ_NEW_SCRIPT)) {
    return contents;
  }

  if (!contents.includes(PBXPROJ_OLD_SCRIPT)) {
    throw new Error('Unable to find React Native bundle script to patch.');
  }

  return contents.replace(PBXPROJ_OLD_SCRIPT, PBXPROJ_NEW_SCRIPT);
}

module.exports = function withIosDevBuildFixes(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const iosDir = config.modRequest.platformProjectRoot;
      const propertiesPath = path.join(iosDir, 'Podfile.properties.json');
      const podfilePath = path.join(iosDir, 'Podfile');
      const pbxprojPath = path.join(iosDir, 'SeaTachys.xcodeproj', 'project.pbxproj');

      let properties = {};
      if (fs.existsSync(propertiesPath)) {
        properties = JSON.parse(fs.readFileSync(propertiesPath, 'utf8'));
      }

      properties['ios.buildReactNativeFromSource'] = 'true';
      fs.writeFileSync(propertiesPath, JSON.stringify(properties, null, 2));

      if (fs.existsSync(podfilePath)) {
        const podfileContents = fs.readFileSync(podfilePath, 'utf8');
        const patchedContents = patchPodfileContents(podfileContents);
        fs.writeFileSync(podfilePath, patchedContents);
      }

      if (fs.existsSync(pbxprojPath)) {
        const pbxprojContents = fs.readFileSync(pbxprojPath, 'utf8');
        const patchedContents = patchPbxprojContents(pbxprojContents);
        fs.writeFileSync(pbxprojPath, patchedContents);
      }

      return config;
    },
  ]);
};
