# Smooth Progress Bar for SD WebUI Forge Neo

![Smooth Progress Preview](images/preview.png)

# Smooth Progress Bar for SD WebUI Forge Neo

<p align="center">
  <a href="https://github.com/Haoming02/sd-webui-forge-classic">
    <img src="https://img.shields.io/badge/Forge-Neo-blue?style=flat" alt="Forge Neo">
  </a>
  <a href="LICENSE">
    <img src="https://img.shields.io/github/license/diamfang/sd-webui-smooth-progress?color=blue&style=flat" alt="License">
  </a>
  <a href="https://github.com/diamfang/sd-webui-smooth-progress/releases">
    <img src="https://img.shields.io/github/v/release/diamfang/sd-webui-smooth-progress?color=green&style=flat" alt="Version">
  </a>
</p>

![Smooth Progress Preview](images/preview.png)

## Features

### 🎨 Visual & Styling
* **Color Presets** - Choose one of the progress bar color presets (Solid, Gradient, Animated).
* **Custom Color** - Customize the progress bar color (Solid, Gradient, Animated).
* **Bar Height** - Adjust the thickness/height of the progress bar.
* **Animation Speed** - Control animation speed for animated bar colors.

### 📊 Progress & Animations
* **Smoothness** - Adjust how smooth progress bar will fill up (Please note that on smoother options it will not be that accurate for generations with low steps count). 
* **Text Format** - Various combinations of info (Steps, %, ETA) displayed on progress bar. 
* **Text Alignment** - Adjust text position on progress bar. 

### ⚙️ Behavior & Lifecycle
* **After Generation** - Choose what happens to the bar once generation finishes (Hide, Hide text only, Keep).
* **Fade Out Duration** - Set the time it takes for the progress bar to smoothly disappear after completion.
* **Interruption** - Custom visual behavior and indicator state when generation is canceled or interrupted.



## 📜 Changelog

<details id="v1-0-0">
<summary><b>v1.0.0 — Initial Release</b></summary>
<br>

* **Core Features**
  * Added customizable progress bar animation with adjustable **Smoothness** levels.
  * Added customizable **Text Format** options (Steps, %, ETA combinations).
  * Added **Text Alignment** settings.

* **Styling & Customization**
  * Added **Color Presets** (Solid, Gradient, Animated) and **Custom Color** options.
  * Added **Bar Height** adjustment.
  * Added **Animation Speed** controls for animated colors.

* **Behavior & Effects**
  * Added **After Generation** behavior modes (*Hide*, *Hide text only*, *Keep*).
  * Added **Fade Out Duration** settings for smooth transitions.
  * Added dedicated **Interruption** state handling for canceled generations.
  * Designed and optimized specifically for **SD WebUI Forge Neo**.

</details>




## Installation
1. Open SD Webui Forge Neo
2. Go to Extensions → Install from URL
3. Paste: `https://github.com/diamfang/sd-webui-smooth-progress`
4. Click Install, then reload the WebUI

> [!WARNING]
>This extension was tested only for Forge Neo. I cannot guarantee that it will work for Automatic1111 or Forge Classic.



## Credits
* [Forge Neo](https://github.com/Haoming02/sd-webui-forge-classic/tree/neo) by Haoming02
