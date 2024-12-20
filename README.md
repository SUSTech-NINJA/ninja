# NINJA Frontend

This is the frontend for the NINJA project.

## Usage

```bash
yarn
yarn run dev
```

## Technologies

- Vue, Vite, Pinia, TypeScript
- TailwindCSS, Element Plus
- Tauri

## Tauri Setup

Tauri is a framework for building desktop applications with web technologies, which is lighter than Electron.

First, Rust and some other dependencies are required. Please refer to
the [Tauri Prerequisites](https://v1.tauri.app/v1/guides/getting-started/prerequisites/) for more information.

### Tauri for your platform

```bash
yarn
yarn run tauri dev
yarn run tauri-build
```

### Tauri for Android

First, you need to download Android Studio and use it to install the Android SDK, NDK, Build Tool and Android Emulator.
Then, you need to set the `ANDROID_HOME` and `NDK_HOME` environment variables.

For example, @RoderickQiu's settings on macOS are as follows:

```bash
export ANDROID_HOME=/Users/r/Library/Android/sdk
export NDK_HOME=/Users/r/Library/Android/sdk/ndk/28.0.12433566
yarn run android
```

And he uses these versions of the Android SDK, NDK and Build Tool:

- Android SDK: 33
- Android NDK: 28.0.12433566
- Android Build Tool: 34.0.0
- Android Emulator: 33.0.0

Then, if you want to build it, you also need to follow
the [signing instructions](https://v2.tauri.app/distribute/sign/android/) in the Tauri documentation.

The build command is as follows:

```bash
yarn run android-build
```

## License

MIT License.