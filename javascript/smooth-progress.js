(function () {
    let animFrameId = null;
    let pollTimer = null;
    let animSpeedSec = parseFloat(localStorage.getItem('spb_anim_speed')) || 3.0;
    let barHeightScale = parseFloat(localStorage.getItem('spb_bar_height')) || 1.0;
    let fadeDurationSec = parseFloat(localStorage.getItem('spb_fade_duration')) || 0.4;
    
    // --- Smoothness Mode State ---
    // 0: Smooth > Accurate (Mode 1)
    // 1: Smooth ~ Accurate (Mode 2)
    // 2: Smooth < Accurate (Mode 3)
    let smoothnessIdx = parseInt(localStorage.getItem('spb_smoothness_idx'), 10);
    if (isNaN(smoothnessIdx) || smoothnessIdx < 0 || smoothnessIdx > 2) smoothnessIdx = 0;

    let textFormatIdx = parseInt(localStorage.getItem('spb_text_format_idx'), 10);
    if (isNaN(textFormatIdx) || textFormatIdx < 0 || textFormatIdx > 7) textFormatIdx = 0;

    let textAlignIdx = parseInt(localStorage.getItem('spb_text_align_idx'), 10);
    if (isNaN(textAlignIdx) || textAlignIdx < 0 || textAlignIdx > 20) textAlignIdx = 10;

    let finishBehaviorIdx = parseInt(localStorage.getItem('spb_finish_behavior_idx'), 10);
    if (isNaN(finishBehaviorIdx) || finishBehaviorIdx < 0 || finishBehaviorIdx > 2) finishBehaviorIdx = 0;
	
	let interruptBehaviorIdx = parseInt(localStorage.getItem('spb_interrupt_behavior_idx'), 10);
    if (isNaN(interruptBehaviorIdx) || interruptBehaviorIdx < 0 || interruptBehaviorIdx > 3) interruptBehaviorIdx = 3;
    
    const SMOOTHNESS_KEYS = ['smooth_gt_acc', 'smooth_eq_acc', 'smooth_lt_acc'];
    const FORMAT_KEYS = ['steps_pct_eta', 'steps_eta', 'steps_pct', 'pct_eta', 'eta_only', 'steps_only', 'pct_only', 'none'];
    const FINISH_KEYS = ['fade', 'fade_text_only', 'keep'];
	const INTERRUPT_KEYS = ['text', 'red_text', 'text_red_bar', 'red_text_red_bar'];
	
    const ALIGN_LABELS = [
        'Left (0%)', '5%', '10%', '15%', '20%', '25%', '30%', '35%', '40%', '45%', 
        'Center (50%)', '55%', '60%', '65%', '70%', '75%', '80%', '85%', '90%', '95%', 'Right (100%)'
    ];

    let visualPct = 0;
    let targetPct = 0;
    let currentStep = 0;
    let totalSteps = 0;
    let currentEtaSec = 0;
    let lastServerUpdateMs = 0;
    let currentSpeedPctPerMs = 0;
    let lastFrameTime = 0;
    let isGenerating = false;
    let isCompleting = false;
    let isFinished = false; 
    let fadeTimeoutId = null;
	let completeTimeoutId = null;
    let isInterrupted = false;

    const barInstances = [];

    const I18N = {
        smoothnessLabel: 'Smoothness:',
        speedLabel: 'Animation Speed:',
        heightLabel: 'Bar Height:',
        fadeLabel: 'Fade Out Duration:',
        formatLabel: 'Text Format:',
        alignLabel: 'Text Alignment:',
        finishLabel: 'After Generation:',
		interruptLabel: 'Interruption:',
        smoothnessModes: {
            smooth_gt_acc: 'Smooth > Accurate',
            smooth_eq_acc: 'Smooth ~ Accurate',
            smooth_lt_acc: 'Smooth < Accurate'
        },
        formats: {
            steps_pct_eta: 'Steps • % • ETA',
            steps_eta: 'Steps • ETA',
            steps_pct: 'Steps • %',
            pct_eta: '% • ETA',
            eta_only: 'Only ETA',
            steps_only: 'Only Steps',
            pct_only: 'Only %',
            none: 'No Text'
        },
        finishModes: {
			fade: 'Fade Out (Bar & Text)',
			fade_text_only: 'Fade Out (Only Text)',
			keep: 'Keep Everything'
		},
        interruptModes: {
            text: 'Text',
            red_text: 'Red Text',
            text_red_bar: 'Text & Red Bar',
            red_text_red_bar: 'Red Text & Red Bar'
        },
        groups: {
            solid: 'Solid',
            gradient: 'Gradient',
            animated: 'Animation',
            custom: 'Custom'
        },
        presets: {
            blue: 'Blue',
            green: 'Green',
            red: 'Red',
            dandelion: 'Dandelion',
            emeraldBlue: 'Emerald-Blue',
            sunset: 'Sunset',
            neon: 'Neon',
            forest: 'Forest',
            rainbow: 'Rainbow',
            aurora: 'Northern Lights',
            cyberpunk: 'Cyberpunk',
            fire: 'Fire Plasmoid',
            customSolid: 'Custom Solid',
            customGradient: 'Custom Gradient',
            customAnim2: 'Custom Animated (2 colors)',
            customAnim3: 'Custom Animated (3 colors)'
        },
        customPickerLabels: {
            color1: 'Color 1:',
            color2: 'Color 2:',
            color3: 'Color 3:'
        },
        resetTitle: 'Reset color'
    };

    const DEFAULT_CUSTOM_COLORS = {
        solid: '#ef256c',
        grad1: '#10b981',
        grad2: '#3b82f6',
        anim2_1: '#ff007f',
        anim2_2: '#00f0ff',
        anim3_1: '#ff0000',
        anim3_2: '#00ff00',
        anim3_3: '#0000ff'
    };

    let customColors = {
        solid: localStorage.getItem('spb_custom_solid') || DEFAULT_CUSTOM_COLORS.solid,
        grad1: localStorage.getItem('spb_custom_grad1') || DEFAULT_CUSTOM_COLORS.grad1,
        grad2: localStorage.getItem('spb_custom_grad2') || DEFAULT_CUSTOM_COLORS.grad2,
        anim2_1: localStorage.getItem('spb_custom_anim2_1') || DEFAULT_CUSTOM_COLORS.anim2_1,
        anim2_2: localStorage.getItem('spb_custom_anim2_2') || DEFAULT_CUSTOM_COLORS.anim2_2,
        anim3_1: localStorage.getItem('spb_custom_anim3_1') || DEFAULT_CUSTOM_COLORS.anim3_1,
        anim3_2: localStorage.getItem('spb_custom_anim3_2') || DEFAULT_CUSTOM_COLORS.anim3_2,
        anim3_3: localStorage.getItem('spb_custom_anim3_3') || DEFAULT_CUSTOM_COLORS.anim3_3
    };

    const COLOR_PRESETS = {
        blue: { style: '#2563eb', type: 'solid' },
        green: { style: '#059669', type: 'solid' },
        red: { style: '#dc2626', type: 'solid' },
        dandelion: { style: '#FEDF08', type: 'solid' },

        emeraldBlue: { style: 'linear-gradient(90deg, #10b981, #3b82f6)', type: 'gradient' },
        sunset: { style: 'linear-gradient(90deg, #ff7e5f, #feb47b)', type: 'gradient' },
        neon: { style: 'linear-gradient(90deg, #8a2387, #e94057, #f27121)', type: 'gradient' },
        forest: { style: 'linear-gradient(90deg, #11998e, #38ef7d)', type: 'gradient' },

        rainbow: { 
            style: 'linear-gradient(270deg, #ff0000, #ff7f00, #ffff00, #00ff00, #0000ff, #4b0082, #8b0083)', 
            type: 'animated', 
            animName: 'spbRainbowAnim',
            keyframes: `@keyframes spbRainbowAnim { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }`
        },
        aurora: { 
            style: 'linear-gradient(270deg, #00c6ff, #0072ff, #22c1c3, #fdbb2d)', 
            type: 'animated', 
            animName: 'spbAuroraAnim',
            keyframes: `@keyframes spbAuroraAnim { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }`
        },
        cyberpunk: { 
            style: 'linear-gradient(270deg, #f806cc, #a86008, #2e68e6, #f806cc)', 
            type: 'animated', 
            animName: 'spbCyberAnim',
            keyframes: `@keyframes spbCyberAnim { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }`
        },
        fire: { 
            style: 'linear-gradient(270deg, #ff4e50, #f9d423, #ff0000, #f9d423)', 
            type: 'animated', 
            animName: 'spbFireAnim',
            keyframes: `@keyframes spbFireAnim { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }`
        },

        customSolid: { type: 'customSolid' },
        customGradient: { type: 'customGradient' },
        customAnim2: { 
            type: 'customAnim2', 
            animName: 'spbCustomAnim2',
            keyframes: `@keyframes spbCustomAnim2 { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }`
        },
        customAnim3: { 
            type: 'customAnim3', 
            animName: 'spbCustomAnim3',
            keyframes: `@keyframes spbCustomAnim3 { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }`
        }
    };

    let selectedPreset = localStorage.getItem('spb_preset') || 'emeraldBlue';

    function getActiveBarStyle() {
        if (selectedPreset === 'customSolid') return customColors.solid;
        if (selectedPreset === 'customGradient') return `linear-gradient(90deg, ${customColors.grad1}, ${customColors.grad2})`;
        if (selectedPreset === 'customAnim2') return `linear-gradient(270deg, ${customColors.anim2_1}, ${customColors.anim2_2}, ${customColors.anim2_1})`;
        if (selectedPreset === 'customAnim3') return `linear-gradient(270deg, ${customColors.anim3_1}, ${customColors.anim3_2}, ${customColors.anim3_3}, ${customColors.anim3_1})`;

        const preset = COLOR_PRESETS[selectedPreset];
        return preset ? preset.style : COLOR_PRESETS.emeraldBlue.style;
    }

    function applyProgressBarStyle(progressEl) {
        if (!progressEl) return;

        const currentStyle = getActiveBarStyle();
        const preset = COLOR_PRESETS[selectedPreset];

        progressEl.style.background = currentStyle;

        if (preset && (preset.type === 'animated' || preset.type === 'customAnim2' || preset.type === 'customAnim3')) {
            progressEl.style.backgroundSize = '400% 400%';
            progressEl.style.animation = `${preset.animName} ${animSpeedSec}s ease infinite`;
        } else {
            progressEl.style.backgroundSize = '';
            progressEl.style.animation = '';
        }
    }

    function updateBarHeight() {
        const baseHeight = 20;
        const computedHeight = baseHeight * barHeightScale;
        barInstances.forEach(inst => {
            inst.container.style.height = `${computedHeight}px`;
        });
    }

    function updateTextAlignmentStyle() {
        let justify = 'center';
        let padding = '0 10px';

        if (textAlignIdx === 0) {
            justify = 'flex-start';
            padding = '0 12px';
        } else if (textAlignIdx === 20) { // 20 = Right (100%)
            justify = 'flex-end';
            padding = '0 28px';
        } else if (textAlignIdx === 10) { // 10 = Center (50%)
            justify = 'center';
            padding = '0 10px';
        } else {
            const pct = (textAlignIdx / 20) * 100; // from 0 to 20
            justify = 'flex-start';
            padding = `0 0 0 calc(${pct}% - 15px)`;
        }

        barInstances.forEach(inst => {
            inst.textOverlay.style.justifyContent = justify;
            inst.textOverlay.style.padding = padding;
        });
    }

    function updateFadeDurationCssVar() {
        barInstances.forEach(inst => {
            inst.container.style.setProperty('--spb-fade-dur', `${fadeDurationSec}s`);
        });
    }

    function injectDynamicStyles() {
        if (document.getElementById('spb-dynamic-css')) return;
        const style = document.createElement('style');
        style.id = 'spb-dynamic-css';
        
        let keyframesCss = '';
        Object.values(COLOR_PRESETS).forEach(p => {
            if (p.keyframes) keyframesCss += p.keyframes + '\n';
        });

        style.textContent = `
            ${keyframesCss}

            @keyframes spbPulseGlow {
                0% { filter: brightness(1) drop-shadow(0 0 0px rgba(255,255,255,0)); }
                50% { filter: brightness(1.35) drop-shadow(0 0 8px rgba(255,255,255,0.7)); }
                100% { filter: brightness(1) drop-shadow(0 0 0px rgba(255,255,255,0)); }
            }
            
            @keyframes spbPulseRedGlow {
                0% { filter: brightness(1) drop-shadow(0 0 0px rgba(239, 68, 68, 0)); }
                50% { filter: brightness(1.35) drop-shadow(0 0 10px rgba(239, 68, 68, 0.8)); }
                100% { filter: brightness(1) drop-shadow(0 0 0px rgba(239, 68, 68, 0)); }
            }
            
            #tab_txt2img .progressDiv, 
            #tab_txt2img #txt2img_results_panel > .progress,
            #tab_img2img .progressDiv, 
            #tab_img2img #img2img_results_panel > .progress {
                display: none !important;
                height: 0 !important;
                margin: 0 !important;
                padding: 0 !important;
                opacity: 0 !important;
                pointer-events: none !important;
            }

            .spb-main-container {
                --spb-fade-dur: 0.4s;
                width: 100%;
                background-color: #111827;
                border: none !important;
                border-radius: 8px;
                position: relative;
                margin-bottom: -8px;
                box-sizing: border-box;
                display: flex !important;
                align-items: center;
                overflow: visible !important;
                opacity: 1 !important;
            }

            .spb-progress-fill {
                transition: opacity var(--spb-fade-dur) ease-in-out;
                height: 100%;
                border-radius: 8px;
                display: block !important;
                opacity: 0;
            }

            .spb-progress-fill.spb-active {
                opacity: 1 !important;
            }

            .spb-progress-fill.spb-smooth-complete {
                transition: width 0.3s ease-out, opacity var(--spb-fade-dur) ease-in-out !important;
            }

            .spb-progress-fill.spb-pulse {
                animation: spbPulseGlow 0.45s ease-in-out;
            }
            
            .spb-progress-fill.spb-pulse-red {
                animation: spbPulseRedGlow 0.45s ease-in-out !important;
            }

            .spb-progress-fill.spb-fade-out {
                opacity: 0 !important;
            }

            .spb-text-overlay {
				position: absolute;
				inset: 0;
				display: flex;
				align-items: center;
				justify-content: center;
				color: #ffffff;
				font-size: 12px;
				font-weight: 600;
				filter: drop-shadow(0px 0px 1.5px rgba(0, 0, 0, 0.95)) drop-shadow(0px 1px 2px rgba(0, 0, 0, 0.8));
				pointer-events: none;
				z-index: 5;
				opacity: 0;
				box-sizing: border-box;
				transition: opacity var(--spb-fade-dur) ease-in-out;
				white-space: nowrap;
			}

			.spb-text-overlay.spb-text-interrupted {
				color: #ff3535 !important;
				filter: drop-shadow(0px 0px 1.5px rgba(0, 0, 0, 0.95)) drop-shadow(0px 1px 2px rgba(0, 0, 0, 0.8)) !important;
			}

            .spb-text-overlay.spb-active {
                opacity: 1 !important;
            }

            .spb-text-overlay.spb-fade-out {
                opacity: 0 !important;
            }

            .spb-settings-btn {
                position: absolute;
                right: 6px;
                top: 50%;
                transform: translateY(-50%);
                background: transparent !important;
                border: none !important;
                outline: none !important;
                box-shadow: none !important;
                cursor: pointer;
                font-size: 14px;
                padding: 0;
                margin: 0;
                line-height: 1;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                color: #ffffff;
                opacity: 0.6;
                transition: opacity 0.2s;
                z-index: 20;
                pointer-events: auto !important;
            }

            .spb-settings-btn:hover {
                opacity: 1;
            }

            .spb-range-input {
                -webkit-appearance: none;
                appearance: none;
                width: 100%;
                height: 4px;
                background: #374151;
                border-radius: 2px;
                outline: none;
                cursor: pointer;
                margin: 4px 0;
            }

            .spb-range-input::-webkit-slider-thumb {
                -webkit-appearance: none;
                appearance: none;
                width: 14px;
                height: 14px;
                border-radius: 50%;
                background: #2563eb;
                cursor: pointer;
                transition: transform 0.1s ease;
            }

            .spb-range-input::-webkit-slider-thumb:hover {
                transform: scale(1.15);
            }

            .spb-range-input::-moz-range-thumb {
                width: 14px;
                height: 14px;
                border: none;
                border-radius: 50%;
                background: #2563eb;
                cursor: pointer;
                transition: transform 0.1s ease;
            }

            fieldset.spb-vba-frame {
                --spb-box-padding: 8px; 
                border: 1px solid #374151 !important;
                border-radius: 6px !important;
                padding: 0 !important;
                margin: 0 !important;
                box-sizing: border-box !important;
                width: 100% !important;
                position: relative !important;
            }

            legend.spb-vba-legend {
                position: absolute !important;
                top: 0 !important;
                left: 8px !important;
                transform: translateY(-50%) !important;
                font-size: 11px !important;
                font-weight: 700 !important;
                color: #9ca3af !important;
                padding: 0 4px !important;
                text-transform: uppercase !important;
                letter-spacing: 0.5px !important;
                z-index: 2 !important;
                background-color: #1f2937 !important;
                width: auto !important;
                line-height: 1 !important;
                margin: 0 !important;
            }

            .spb-grid-container {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 8px;
                padding: var(--spb-box-padding) !important;
                margin: 0 !important;
                width: 100%;
                box-sizing: border-box;
                position: relative;
                z-index: 1;
            }
        `;
        document.head.appendChild(style);
    }

    function createBarInstance(targetPanel) {
        if (!targetPanel || targetPanel.querySelector('.spb-main-container')) return;

        const container = document.createElement('div');
        container.className = 'spb-main-container';

        const progressFill = document.createElement('div');
        progressFill.className = 'spb-progress-fill';
        progressFill.style.width = '0%';

        const textOverlay = document.createElement('div');
        textOverlay.className = 'spb-text-overlay';

        const settingsBtn = document.createElement('button');
        settingsBtn.className = 'spb-settings-btn';
        settingsBtn.innerHTML = '⚙️';
        settingsBtn.title = 'Settings';

        const settingsPanel = createSettingsPanel();

        settingsBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const isVisible = settingsPanel.style.display === 'flex';
            
            document.querySelectorAll('.spb-settings-panel').forEach(p => p.style.display = 'none');
            settingsPanel.style.display = isVisible ? 'none' : 'flex';
        });

        container.appendChild(progressFill);
        container.appendChild(textOverlay);
        container.appendChild(settingsBtn);
        container.appendChild(settingsPanel);

        targetPanel.parentNode.insertBefore(container, targetPanel);
        
        const instance = {
            container,
            progressFill,
            textOverlay,
            lastText: ''
        };

        barInstances.push(instance);
        applyProgressBarStyle(progressFill);
    }

    function injectUI() {
        const txt2imgPanel = document.querySelector('#txt2img_results_panel');
        const img2imgPanel = document.querySelector('#img2img_results_panel');

        if (txt2imgPanel) createBarInstance(txt2imgPanel);
        if (img2imgPanel) createBarInstance(img2imgPanel);

        document.addEventListener('click', (e) => {
            let isInsideAny = false;
            barInstances.forEach(inst => {
                if (inst.container.contains(e.target)) isInsideAny = true;
            });

            if (!isInsideAny) {
                document.querySelectorAll('.spb-settings-panel').forEach(p => p.style.display = 'none');
            }

            const target = e.target;
            if (target && (target.id === 'txt2img_generate' || target.id === 'img2img_generate' || (target.id && target.id.includes('generate')) || (target.innerText && target.innerText.trim().toLowerCase() === 'generate'))) {
                triggerInitialCalculatingState();
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                document.querySelectorAll('.spb-settings-panel').forEach(p => p.style.display = 'none');
            }
        });

        injectDynamicStyles();
        updateBarHeight();
        updateTextAlignmentStyle();
        updateFadeDurationCssVar();

        if (FINISH_KEYS[finishBehaviorIdx] === 'keep' || FINISH_KEYS[finishBehaviorIdx] === 'fade_text_only') {
			restoreKeepFilledNow();
			if (FINISH_KEYS[finishBehaviorIdx] === 'fade_text_only') {
				triggerFadeOutNow();
			}
		}
    }

    function triggerInitialCalculatingState() {
        if (fadeTimeoutId) {
            clearTimeout(fadeTimeoutId);
            fadeTimeoutId = null;
        }
		
		if (completeTimeoutId) {
            clearTimeout(completeTimeoutId);
            completeTimeoutId = null;
        }

        isGenerating = true;
        isCompleting = false;
        isFinished = false;
        isInterrupted = false;

        visualPct = 0;
        targetPct = 0;
        currentStep = 0;
        totalSteps = 0;
        currentEtaSec = 0;
        lastServerUpdateMs = 0;
        currentSpeedPctPerMs = 0;
        lastFrameTime = 0;

        barInstances.forEach(inst => {
            // Disable transition temporarily for immediate reset to 0%
            inst.progressFill.style.setProperty('transition', 'none', 'important');
            inst.progressFill.style.setProperty('width', '0%', 'important');
            inst.progressFill.style.setProperty('opacity', '1', 'important');

            // Remove finish and interrupt classes
            inst.progressFill.classList.remove('spb-smooth-complete', 'spb-pulse', 'spb-pulse-red', 'spb-fade-out');
            inst.progressFill.classList.add('spb-active');

            // Force reflow to immediately apply 0% width
            void inst.progressFill.offsetHeight;

            // Restore normal transition property and styles
            inst.progressFill.style.removeProperty('transition');
            applyProgressBarStyle(inst.progressFill);

            inst.textOverlay.className = 'spb-text-overlay spb-active';
            inst.textOverlay.style.opacity = '1';
			inst.textOverlay.classList.remove('spb-fade-out', 'spb-text-interrupted')
			inst.textOverlay.textContent = '';
            inst.lastText = '';
			
			inst.textOverlay.classList.remove('spb-fade-out');
            inst.textOverlay.classList.add('spb-active');
            inst.textOverlay.style.opacity = '1';
        });

        updateOverlayTextFormatted(0, 0);
    }

    function createSettingsPanel() {
        const panel = document.createElement('div');
        panel.className = 'spb-settings-panel';
        panel.style.cssText = `
            display: none;
            flex-direction: column;
            gap: 12px;
            position: absolute;
            top: calc(100% + 6px);
            right: 0;
            background: #1f2937;
            border: 1px solid #374151;
            border-radius: 8px;
            padding: 12px;
            z-index: 999999;
            width: 240px;
            box-shadow: 0 8px 24px rgba(0,0,0,0.7);
            max-height: 80vh;
            overflow-y: auto;
            pointer-events: auto;
            opacity: 1 !important;
            box-sizing: border-box;
        `;

        renderPanelContent(panel);
        return panel;
    }

    function updatePresetSelection(panel) {
        panel.querySelectorAll('[data-preset]').forEach(el => {
            const active = el.getAttribute('data-preset') === selectedPreset;

            el.style.boxShadow = active 
                ? '0 0 0 2px #ffffff, 0 0 0 4px #3b82f6' 
                : 'inset 0 0 0 1px rgba(255,255,255,0.15)';

            el.innerHTML = active ? '<span style="color:#fff; text-shadow:0 1px 2px #000; font-weight:bold; font-size:14px;">✓</span>' : '';
            el.style.display = 'flex';
            el.style.alignItems = 'center';
            el.style.justifyContent = 'center';
        });
    }

    function updateAllPanels() {
        document.querySelectorAll('.spb-settings-panel').forEach(panel => {
            updatePresetSelection(panel);
            updateCustomPickersVisibility(panel);
        });
        barInstances.forEach(inst => applyProgressBarStyle(inst.progressFill));
    }

    function updateAllPreviews(panel) {
        panel.querySelectorAll('[data-preset]').forEach(item => {
            const presetId = item.getAttribute('data-preset');
            const presetData = COLOR_PRESETS[presetId];
            if (!item || !presetData) return;

            let bgStyle = getPreviewStyleForPreset(presetId);
            
            if (item.style.backgroundImage !== bgStyle && item.style.background !== bgStyle) {
                item.style.background = bgStyle;
            }

            if (presetData.type === 'animated' || presetData.type === 'customAnim2' || presetData.type === 'customAnim3') {
                item.style.backgroundSize = '400% 400%';
                if (!item.style.animationName) {
                    item.style.animation = `${presetData.animName} ${animSpeedSec}s ease infinite`;
                } else {
                    item.style.animationDuration = `${animSpeedSec}s`;
                }
            } else {
                item.style.backgroundSize = '';
                item.style.animation = '';
            }
        });
    }

    function renderPanelContent(panel) {
        panel.innerHTML = '';

        const controlsContainer = document.createElement('div');
        controlsContainer.style.cssText = 'display: flex; flex-direction: column; gap: 8px; border-bottom: 0px solid #374151; padding-bottom: 10px;';

        // 0. Smoothness Mode Selector
        const smoothRow = document.createElement('div');
        smoothRow.style.cssText = 'display: flex; flex-direction: column; gap: 4px;';

        const smoothHeader = document.createElement('div');
        smoothHeader.style.cssText = 'display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: #9ca3af; font-weight: bold;';

        const smoothTitle = document.createElement('span');
        smoothTitle.textContent = I18N.smoothnessLabel;

        const smoothValSpan = document.createElement('span');
        smoothValSpan.style.color = '#3b82f6';
        smoothValSpan.className = 'spb-smoothness-val';
        smoothValSpan.textContent = I18N.smoothnessModes[SMOOTHNESS_KEYS[smoothnessIdx]];

        smoothHeader.appendChild(smoothTitle);
        smoothHeader.appendChild(smoothValSpan);

        const smoothInput = document.createElement('input');
        smoothInput.type = 'range';
        smoothInput.className = 'spb-range-input spb-smoothness-input';
        smoothInput.min = '0';
        smoothInput.max = '2';
        smoothInput.step = '1';
        smoothInput.value = smoothnessIdx;

        smoothInput.addEventListener('input', (e) => {
            smoothnessIdx = parseInt(e.target.value, 10);
            localStorage.setItem('spb_smoothness_idx', smoothnessIdx);
            
            document.querySelectorAll('.spb-settings-panel').forEach(p => {
                const val = p.querySelector('.spb-smoothness-val');
                if (val) val.textContent = I18N.smoothnessModes[SMOOTHNESS_KEYS[smoothnessIdx]];
                const inp = p.querySelector('.spb-smoothness-input');
                if (inp) inp.value = smoothnessIdx;
            });
        });

        smoothRow.appendChild(smoothHeader);
        smoothRow.appendChild(smoothInput);
        controlsContainer.appendChild(smoothRow);

        // 1. Text format
        const formatRow = document.createElement('div');
        formatRow.style.cssText = 'display: flex; flex-direction: column; gap: 4px;';

        const formatHeader = document.createElement('div');
        formatHeader.style.cssText = 'display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: #9ca3af; font-weight: bold;';

        const formatTitle = document.createElement('span');
        formatTitle.textContent = I18N.formatLabel;

        const formatValSpan = document.createElement('span');
        formatValSpan.style.color = '#3b82f6';
        formatValSpan.className = 'spb-format-val';
        formatValSpan.textContent = I18N.formats[FORMAT_KEYS[textFormatIdx]];

        formatHeader.appendChild(formatTitle);
        formatHeader.appendChild(formatValSpan);

        const formatInput = document.createElement('input');
        formatInput.type = 'range';
        formatInput.className = 'spb-range-input spb-format-input';
        formatInput.min = '0';
        formatInput.max = '7';
        formatInput.step = '1';
        formatInput.value = textFormatIdx;

        formatInput.addEventListener('input', (e) => {
            textFormatIdx = parseInt(e.target.value, 10);
            localStorage.setItem('spb_text_format_idx', textFormatIdx);
            document.querySelectorAll('.spb-settings-panel').forEach(p => {
                const val = p.querySelector('.spb-format-val');
                if (val) val.textContent = I18N.formats[FORMAT_KEYS[textFormatIdx]];
                const inp = p.querySelector('.spb-format-input');
                if (inp) inp.value = textFormatIdx;
            });
            
            // Text update for all text formats
            const displayEta = Math.ceil(Math.max(0, currentEtaSec));
            updateOverlayTextFormatted(isFinished ? 100 : visualPct, displayEta);
        });

        formatRow.appendChild(formatHeader);
        formatRow.appendChild(formatInput);
        controlsContainer.appendChild(formatRow);

        // 2. Text align
        const alignRow = document.createElement('div');
        alignRow.style.cssText = 'display: flex; flex-direction: column; gap: 4px;';

        const alignHeader = document.createElement('div');
        alignHeader.style.cssText = 'display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: #9ca3af; font-weight: bold;';

        const alignTitle = document.createElement('span');
        alignTitle.textContent = I18N.alignLabel;

        const alignValSpan = document.createElement('span');
        alignValSpan.style.color = '#3b82f6';
        alignValSpan.className = 'spb-align-val';
        alignValSpan.textContent = ALIGN_LABELS[textAlignIdx];

        alignHeader.appendChild(alignTitle);
        alignHeader.appendChild(alignValSpan);

        const alignInput = document.createElement('input');
        alignInput.type = 'range';
        alignInput.className = 'spb-range-input spb-align-input';
        alignInput.min = '0';
        alignInput.max = '20';
        alignInput.step = '1';
        alignInput.value = textAlignIdx;

        alignInput.addEventListener('input', (e) => {
            textAlignIdx = parseInt(e.target.value, 10);
            localStorage.setItem('spb_text_align_idx', textAlignIdx);
            
            document.querySelectorAll('.spb-settings-panel').forEach(p => {
                const val = p.querySelector('.spb-align-val');
                if (val) val.textContent = ALIGN_LABELS[textAlignIdx];
                const inp = p.querySelector('.spb-align-input');
                if (inp) inp.value = textAlignIdx;
            });
            updateTextAlignmentStyle();
        });

        alignRow.appendChild(alignHeader);
        alignRow.appendChild(alignInput);
        controlsContainer.appendChild(alignRow);

        // 3. Actions after finish
        const finishRow = document.createElement('div');
        finishRow.style.cssText = 'display: flex; flex-direction: column; gap: 4px;';

        const finishHeader = document.createElement('div');
        finishHeader.style.cssText = 'display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: #9ca3af; font-weight: bold;';

        const finishTitle = document.createElement('span');
        finishTitle.textContent = I18N.finishLabel;

        const finishValSpan = document.createElement('span');
        finishValSpan.style.color = '#3b82f6';
        finishValSpan.className = 'spb-finish-val';
        finishValSpan.textContent = I18N.finishModes[FINISH_KEYS[finishBehaviorIdx]];

        finishHeader.appendChild(finishTitle);
        finishHeader.appendChild(finishValSpan);

        const finishInput = document.createElement('input');
        finishInput.type = 'range';
        finishInput.className = 'spb-range-input spb-finish-input';
        finishInput.min = '0';
        finishInput.max = '2';
        finishInput.step = '1';
        finishInput.value = finishBehaviorIdx;

        finishInput.addEventListener('input', (e) => {
            finishBehaviorIdx = parseInt(e.target.value, 10);
            localStorage.setItem('spb_finish_behavior_idx', finishBehaviorIdx);

            document.querySelectorAll('.spb-settings-panel').forEach(p => {
                const val = p.querySelector('.spb-finish-val');
                if (val) val.textContent = I18N.finishModes[FINISH_KEYS[finishBehaviorIdx]];
                const inp = p.querySelector('.spb-finish-input');
                if (inp) inp.value = finishBehaviorIdx;
            });
			
			restoreLastState();
			
            const activeFinish = FINISH_KEYS[finishBehaviorIdx];

            // Interrupted
            if (isInterrupted) {
                if (activeFinish === 'keep') {
                    barInstances.forEach(inst => {
                        inst.textOverlay.classList.remove('spb-fade-out');
                        inst.textOverlay.classList.add('spb-active');
                        inst.textOverlay.style.opacity = '1';
                    });
                } else if (activeFinish === 'fade_text_only') {
                    barInstances.forEach(inst => {
                        inst.textOverlay.classList.remove('spb-active');
                        inst.textOverlay.classList.add('spb-fade-out');
                        inst.textOverlay.style.opacity = '0';
                    });
                } else if (activeFinish === 'fade') {
                    triggerFadeOutNow();
                }
                return;
            }

            // basic
            if (activeFinish === 'keep') {
                restoreKeepFilledNow();
            } else if (activeFinish === 'fade_text_only') {
                if (isFinished) {
                    restoreKeepFilledNow();
                    barInstances.forEach(inst => {
                        inst.textOverlay.classList.remove('spb-active');
                        inst.textOverlay.classList.add('spb-fade-out');
                        inst.textOverlay.style.opacity = '0';
                    });
                }
            } else if (activeFinish === 'fade') {
                triggerFadeOutNow();
            }
        });

        finishRow.appendChild(finishHeader);
        finishRow.appendChild(finishInput);
        controlsContainer.appendChild(finishRow);
		
		const interruptRow = document.createElement('div');
        interruptRow.style.cssText = 'display: flex; flex-direction: column; gap: 4px;';

        const interruptHeader = document.createElement('div');
        interruptHeader.style.cssText = 'display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: #9ca3af; font-weight: bold;';

        const interruptTitle = document.createElement('span');
        interruptTitle.textContent = I18N.interruptLabel;

        const interruptValSpan = document.createElement('span');
        interruptValSpan.style.color = '#3b82f6';
        interruptValSpan.className = 'spb-interrupt-val';
        interruptValSpan.textContent = I18N.interruptModes[INTERRUPT_KEYS[interruptBehaviorIdx]];

        interruptHeader.appendChild(interruptTitle);
        interruptHeader.appendChild(interruptValSpan);

        const interruptInput = document.createElement('input');
        interruptInput.type = 'range';
        interruptInput.className = 'spb-range-input spb-interrupt-input';
        interruptInput.min = '0';
        interruptInput.max = '2';
        interruptInput.step = '1';
        interruptInput.value = interruptBehaviorIdx;

        interruptInput.addEventListener('input', (e) => {
            interruptBehaviorIdx = parseInt(e.target.value, 10);
            localStorage.setItem('spb_interrupt_behavior_idx', interruptBehaviorIdx);

            document.querySelectorAll('.spb-settings-panel').forEach(p => {
                const val = p.querySelector('.spb-interrupt-val');
                if (val) val.textContent = I18N.interruptModes[INTERRUPT_KEYS[interruptBehaviorIdx]];
                const inp = p.querySelector('.spb-interrupt-input');
                if (inp) inp.value = interruptBehaviorIdx;
            });

            if (isInterrupted) {
                restoreLastState();
            }
        });

        interruptRow.appendChild(interruptHeader);
        interruptRow.appendChild(interruptInput);
        controlsContainer.appendChild(interruptRow);

        // 4. Bar height
        const heightRow = document.createElement('div');
        heightRow.style.cssText = 'display: flex; flex-direction: column; gap: 4px;';

        const heightHeader = document.createElement('div');
        heightHeader.style.cssText = 'display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: #9ca3af; font-weight: bold;';
        
        const heightTitle = document.createElement('span');
        heightTitle.textContent = I18N.heightLabel;
        
        const heightValSpan = document.createElement('span');
        heightValSpan.style.color = '#3b82f6';
        heightValSpan.className = 'spb-height-val';
        heightValSpan.textContent = `${barHeightScale}x`;

        heightHeader.appendChild(heightTitle);
        heightHeader.appendChild(heightValSpan);

        const heightInput = document.createElement('input');
        heightInput.type = 'range';
        heightInput.className = 'spb-range-input spb-height-input';
        heightInput.min = '0.5';
        heightInput.max = '2.5';
        heightInput.step = '0.25';
        heightInput.value = barHeightScale;

        heightInput.addEventListener('input', (e) => {
            barHeightScale = parseFloat(e.target.value);
            localStorage.setItem('spb_bar_height', barHeightScale);
            document.querySelectorAll('.spb-settings-panel').forEach(p => {
                const val = p.querySelector('.spb-height-val');
                if (val) val.textContent = `${barHeightScale}x`;
                const inp = p.querySelector('.spb-height-input');
                if (inp) inp.value = barHeightScale;
            });
            updateBarHeight();
        });

        heightRow.appendChild(heightHeader);
        heightRow.appendChild(heightInput);
        controlsContainer.appendChild(heightRow);

        // 5. Animation speed
        const speedRow = document.createElement('div');
        speedRow.style.cssText = 'display: flex; flex-direction: column; gap: 4px;';

        const speedHeader = document.createElement('div');
        speedHeader.style.cssText = 'display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: #9ca3af; font-weight: bold;';
        
        const speedTitle = document.createElement('span');
        speedTitle.textContent = I18N.speedLabel;
        
        const speedValSpan = document.createElement('span');
        speedValSpan.style.color = '#3b82f6';
        speedValSpan.className = 'spb-speed-val';
        speedValSpan.textContent = `${animSpeedSec.toFixed(1)}s`;

        speedHeader.appendChild(speedTitle);
        speedHeader.appendChild(speedValSpan);

        const speedInput = document.createElement('input');
        speedInput.type = 'range';
        speedInput.className = 'spb-range-input spb-speed-input';
        speedInput.min = '0.5';
        speedInput.max = '10.0';
        speedInput.step = '0.5';
        speedInput.value = animSpeedSec;

        speedInput.addEventListener('input', (e) => {
            animSpeedSec = parseFloat(e.target.value);
            localStorage.setItem('spb_anim_speed', animSpeedSec);
            document.querySelectorAll('.spb-settings-panel').forEach(p => {
                const val = p.querySelector('.spb-speed-val');
                if (val) val.textContent = `${animSpeedSec.toFixed(1)}s`;
                const inp = p.querySelector('.spb-speed-input');
                if (inp) inp.value = animSpeedSec;
                updateAllPreviews(p);
            });

            barInstances.forEach(inst => applyProgressBarStyle(inst.progressFill));
        });

        speedRow.appendChild(speedHeader);
        speedRow.appendChild(speedInput);
        controlsContainer.appendChild(speedRow);

        // 6. Fade delay
        const fadeRow = document.createElement('div');
        fadeRow.style.cssText = 'display: flex; flex-direction: column; gap: 4px;';

        const fadeHeader = document.createElement('div');
        fadeHeader.style.cssText = 'display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: #9ca3af; font-weight: bold;';

        const fadeTitle = document.createElement('span');
        fadeTitle.textContent = I18N.fadeLabel;

        const fadeValSpan = document.createElement('span');
        fadeValSpan.style.color = '#3b82f6';
        fadeValSpan.className = 'spb-fade-val';
        fadeValSpan.textContent = `${fadeDurationSec.toFixed(1)}s`;

        fadeHeader.appendChild(fadeTitle);
        fadeHeader.appendChild(fadeValSpan);

        const fadeInput = document.createElement('input');
        fadeInput.type = 'range';
        fadeInput.className = 'spb-range-input spb-fade-input';
        fadeInput.min = '0.1';
        fadeInput.max = '2.0';
        fadeInput.step = '0.1';
        fadeInput.value = fadeDurationSec;

        fadeInput.addEventListener('input', (e) => {
            fadeDurationSec = parseFloat(e.target.value);
            localStorage.setItem('spb_fade_duration', fadeDurationSec);
            document.querySelectorAll('.spb-settings-panel').forEach(p => {
                const val = p.querySelector('.spb-fade-val');
                if (val) val.textContent = `${fadeDurationSec.toFixed(1)}s`;
                const inp = p.querySelector('.spb-fade-input');
                if (inp) inp.value = fadeDurationSec;
            });
            updateFadeDurationCssVar();
        });

        fadeRow.appendChild(fadeHeader);
        fadeRow.appendChild(fadeInput);
        controlsContainer.appendChild(fadeRow);

        panel.appendChild(controlsContainer);

        // Color presets grid
        const groupsConfig = [
            { key: 'solid', items: ['blue', 'green', 'red', 'dandelion'] },
            { key: 'gradient', items: ['emeraldBlue', 'sunset', 'neon', 'forest'] },
            { key: 'animated', items: ['rainbow', 'aurora', 'cyberpunk', 'fire'] },
            { key: 'custom', items: ['customSolid', 'customGradient', 'customAnim2', 'customAnim3'] }
        ];

        const listContainer = document.createElement('div');
        listContainer.style.cssText = 'display: flex; flex-direction: column; gap: 8px; width: 100%; box-sizing: border-box;';

        groupsConfig.forEach(group => {
            const fieldset = document.createElement('fieldset');
            fieldset.className = 'spb-vba-frame';
            
            const legend = document.createElement('legend');
            legend.className = 'spb-vba-legend';
            legend.textContent = I18N.groups[group.key];
            fieldset.appendChild(legend);

            const gridContainer = document.createElement('div');
            gridContainer.className = 'spb-grid-container';

            group.items.forEach(presetId => {
                const presetData = COLOR_PRESETS[presetId];
                if (!presetData) return;

                const item = document.createElement('div');
                item.setAttribute('data-preset', presetId);
                item.title = I18N.presets[presetId] || presetId;
                
                let bgStyle = getPreviewStyleForPreset(presetId);

                let itemStyle = `
                    width: 100%;
                    aspect-ratio: 1;
                    border-radius: 6px;
                    background: ${bgStyle};
                    cursor: pointer;
                    transition: transform 0.1s ease, box-shadow 0.15s ease;
                    box-sizing: border-box;
                `;

                if (presetData.type === 'animated' || presetData.type === 'customAnim2' || presetData.type === 'customAnim3') {
                    itemStyle += `
                        background-size: 400% 400%;
                        animation: ${presetData.animName} ${animSpeedSec}s ease infinite;
                    `;
                }

                item.style.cssText = itemStyle;

                item.addEventListener('mouseenter', () => {
                    item.style.transform = 'scale(1.08)';
                });
                item.addEventListener('mouseleave', () => {
                    item.style.transform = 'scale(1)';
                });

                item.addEventListener('click', (e) => {
                    e.stopPropagation();
                    selectedPreset = presetId;
                    localStorage.setItem('spb_preset', selectedPreset);

                    updateAllPanels();
                });

                gridContainer.appendChild(item);
            });

            fieldset.appendChild(gridContainer);
            listContainer.appendChild(fieldset);
        });

        panel.appendChild(listContainer);

        const customPickersWrapper = document.createElement('div');
        customPickersWrapper.className = 'spb-custom-pickers-wrapper';
        customPickersWrapper.style.cssText = 'margin-top: 4px; padding-top: 8px; border-top: 0px solid #374151; display: flex; flex-direction: column; gap: 6px; width: 100%; box-sizing: border-box;';

        panel.appendChild(customPickersWrapper);
        
        updatePresetSelection(panel);
        updateCustomPickersVisibility(panel);
    }

    function getPreviewStyleForPreset(presetId) {
        if (presetId === 'customSolid') return customColors.solid;
        if (presetId === 'customGradient') return `linear-gradient(90deg, ${customColors.grad1}, ${customColors.grad2})`;
        if (presetId === 'customAnim2') return `linear-gradient(270deg, ${customColors.anim2_1}, ${customColors.anim2_2}, ${customColors.anim2_1})`;
        if (presetId === 'customAnim3') return `linear-gradient(270deg, ${customColors.anim3_1}, ${customColors.anim3_2}, ${customColors.anim3_3}, ${customColors.anim3_1})`;
        return COLOR_PRESETS[presetId] ? COLOR_PRESETS[presetId].style : '#ffffff';
    }

    function updateCustomPickersVisibility(panel) {
        const wrapper = panel.querySelector('.spb-custom-pickers-wrapper');
        if (!wrapper) return;

        if (!selectedPreset.startsWith('custom')) {
            wrapper.style.display = 'none';
            wrapper.innerHTML = '';
            return;
        }

        wrapper.style.display = 'flex';

        if (wrapper.getAttribute('data-current-preset') === selectedPreset) {
            const inputs = wrapper.querySelectorAll('input[type="color"]');
            if (selectedPreset === 'customSolid' && inputs[0]) inputs[0].value = customColors.solid;
            if (selectedPreset === 'customGradient') {
                if (inputs[0]) inputs[0].value = customColors.grad1;
                if (inputs[1]) inputs[1].value = customColors.grad2;
            }
            if (selectedPreset === 'customAnim2') {
                if (inputs[0]) inputs[0].value = customColors.anim2_1;
                if (inputs[1]) inputs[1].value = customColors.anim2_2;
            }
            if (selectedPreset === 'customAnim3') {
                if (inputs[0]) inputs[0].value = customColors.anim3_1;
                if (inputs[1]) inputs[1].value = customColors.anim3_2;
                if (inputs[2]) inputs[2].value = customColors.anim3_3;
            }
            return;
        }

        wrapper.innerHTML = '';
        wrapper.setAttribute('data-current-preset', selectedPreset);

        const createColorInputRow = (labelKey, storageKey, objKey) => {
            const row = document.createElement('div');
            row.style.cssText = 'display: flex; align-items: center; justify-content: space-between;';

            const label = document.createElement('span');
            label.textContent = I18N.customPickerLabels[labelKey];
            label.style.fontSize = '12px';
            label.style.color = '#9ca3af';

            const rightControls = document.createElement('div');
            rightControls.style.cssText = 'display: flex; align-items: center; gap: 6px;';

            const input = document.createElement('input');
            input.type = 'color';
            input.value = customColors[objKey];
            input.style.cssText = 'border: none; width: 26px; height: 26px; cursor: pointer; background: transparent; padding: 0;';

            const resetBtn = document.createElement('button');
            resetBtn.innerHTML = '↺';
            resetBtn.title = I18N.resetTitle;
            resetBtn.style.cssText = `
                background: #374151;
                color: #9ca3af;
                border: none;
                border-radius: 4px;
                width: 22px;
                height: 22px;
                font-size: 12px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: color 0.15s, background 0.15s;
                line-height: 1;
            `;
            resetBtn.addEventListener('mouseenter', () => {
                resetBtn.style.background = '#4b5563';
                resetBtn.style.color = '#ffffff';
            });
            resetBtn.addEventListener('mouseleave', () => {
                resetBtn.style.background = '#374151';
                resetBtn.style.color = '#9ca3af';
            });

            const applyColorUpdate = (newColor) => {
                customColors[objKey] = newColor;
                input.value = newColor;
                localStorage.setItem(storageKey, newColor);

                document.querySelectorAll('.spb-settings-panel').forEach(p => {
                    const itemPreview = p.querySelector(`[data-preset="${selectedPreset}"]`);
                    if (itemPreview) {
                        itemPreview.style.background = getPreviewStyleForPreset(selectedPreset);
                        const presetData = COLOR_PRESETS[selectedPreset];
                        if (presetData && (presetData.type === 'customAnim2' || presetData.type === 'customAnim3')) {
                            itemPreview.style.backgroundSize = '400% 400%';
                        }
                    }
                });

                barInstances.forEach(inst => applyProgressBarStyle(inst.progressFill));
            };

            input.addEventListener('input', (e) => {
                applyColorUpdate(e.target.value);
            });

            resetBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const defaultColor = DEFAULT_CUSTOM_COLORS[objKey];
                applyColorUpdate(defaultColor);
            });

            rightControls.appendChild(input);
            rightControls.appendChild(resetBtn);

            row.appendChild(label);
            row.appendChild(rightControls);
            return row;
        };

        if (selectedPreset === 'customSolid') {
            wrapper.appendChild(createColorInputRow('color1', 'spb_custom_solid', 'solid'));
        } else if (selectedPreset === 'customGradient') {
            wrapper.appendChild(createColorInputRow('color1', 'spb_custom_grad1', 'grad1'));
            wrapper.appendChild(createColorInputRow('color2', 'spb_custom_grad2', 'grad2'));
        } else if (selectedPreset === 'customAnim2') {
            wrapper.appendChild(createColorInputRow('color1', 'spb_custom_anim2_1', 'anim2_1'));
            wrapper.appendChild(createColorInputRow('color2', 'spb_custom_anim2_2', 'anim2_2'));
        } else if (selectedPreset === 'customAnim3') {
            wrapper.appendChild(createColorInputRow('color1', 'spb_custom_anim3_1', 'anim3_1'));
            wrapper.appendChild(createColorInputRow('color2', 'spb_custom_anim3_2', 'anim3_2'));
            wrapper.appendChild(createColorInputRow('color3', 'spb_custom_anim3_3', 'anim3_3'));
        }
    }

    function stopAnimation() {
        if (animFrameId) {
            cancelAnimationFrame(animFrameId);
            animFrameId = null;
        }

        if (fadeTimeoutId) {
            clearTimeout(fadeTimeoutId);
            fadeTimeoutId = null;
        }

        const activeFinish = FINISH_KEYS[finishBehaviorIdx] || 'fade';
        if ((activeFinish === 'keep' || activeFinish === 'fade_text_only') && (isFinished || isInterrupted)) {
            return;
        }

        barInstances.forEach(inst => {
            inst.progressFill.className = 'spb-progress-fill';
            inst.progressFill.style.opacity = '0';
            inst.textOverlay.className = 'spb-text-overlay';
            inst.textOverlay.style.opacity = '0';
        });

        isGenerating = false;
        isCompleting = false;
    }

    function updateOverlayTextFormatted(pct, etaSec) {
        const activeFormat = FORMAT_KEYS[textFormatIdx] || 'steps_pct_eta';

        if (activeFormat === 'none' && !isInterrupted) {
            barInstances.forEach(inst => {
                inst.textOverlay.textContent = '';
                inst.lastText = '';
            });
            return;
        }

        const roundedPct = isFinished ? 100 : Math.round(pct);
        const etaStr = (etaSec > 0 && !isFinished && !isInterrupted) ? `${etaSec}s` : '?';
        const stepStr = `${currentStep}/${totalSteps}`;
        let textStr = '';

        if (isInterrupted) {
            switch (activeFormat) {
                case 'steps_pct_eta': // 'Steps • % • ETA'
                case 'steps_pct':     // 'Steps • %'
                    textStr = `${stepStr} • ${roundedPct}% • Interrupted`;
                    break;

                case 'steps_eta':     // 'Steps • ETA'
                case 'steps_only':    // 'Only Steps'
                    textStr = `${stepStr} • Interrupted`;
                    break;

                case 'pct_eta':       // '% • ETA'
                case 'pct_only':      // 'Only %'
                    textStr = `${roundedPct}% • Interrupted`;
                    break;

                case 'eta_only':      // 'Only ETA'
                    textStr = 'Interrupted';
                    break;

                case 'none':          // 'No Text'
                    textStr = '❌';
                    break;

                default:
                    textStr = 'Interrupted';
            }
        } else {
            const hasEta = (roundedPct < 100 && !isFinished);

            switch (activeFormat) {
                case 'steps_pct_eta':
                    textStr = hasEta ? `${stepStr} • ${roundedPct}% • ${etaStr}` : `${stepStr} • ${roundedPct}%`;
                    break;
                case 'steps_eta':
                    textStr = hasEta ? `${stepStr} • ${etaStr}` : `${stepStr}`;
                    break;
                case 'steps_pct':
                    textStr = `${stepStr} • ${roundedPct}%`;
                    break;
                case 'pct_eta':
                    textStr = hasEta ? `${roundedPct}% • ${etaStr}` : `${roundedPct}%`;
                    break;
                case 'eta_only':
                    textStr = hasEta ? `${etaStr}` : `0s`;
                    break;
                case 'steps_only':
                    textStr = `${stepStr}`;
                    break;
                case 'pct_only':
                    textStr = `${roundedPct}%`;
                    break;
                default:
                    textStr = `${roundedPct}%`;
            }
        }

        barInstances.forEach(inst => {
            if (inst.lastText !== textStr) {
                inst.textOverlay.textContent = textStr;
                inst.lastText = textStr;
            }
        });
    }
	
    function triggerInterruptedState() {
        if (isInterrupted || (!isGenerating && visualPct === 0)) return;

        if (animFrameId) {
            cancelAnimationFrame(animFrameId);
            animFrameId = null;
        }

        isGenerating = false;
        isCompleting = false;
        isInterrupted = true;

        updateOverlayTextFormatted(visualPct, 0);

        const activeInterrupt = INTERRUPT_KEYS[interruptBehaviorIdx] || 'red_text_red_bar';

        barInstances.forEach(inst => {
            // red bar
            if (activeInterrupt === 'text_red_bar' || activeInterrupt === 'red_text_red_bar') {
                inst.progressFill.style.background = '#dc2626';
                inst.progressFill.style.animation = 'none';
                inst.progressFill.classList.add('spb-pulse-red');
            } else {
                applyProgressBarStyle(inst.progressFill);
            }

            // red text
            if (activeInterrupt === 'red_text' || activeInterrupt === 'red_text_red_bar') {
                inst.textOverlay.classList.add('spb-text-interrupted');
            } else {
                inst.textOverlay.classList.remove('spb-text-interrupted');
            }
        });

        setTimeout(() => {
            const activeFinish = FINISH_KEYS[finishBehaviorIdx] || 'fade';
            
            if (activeFinish === 'keep') {
                barInstances.forEach(inst => {
                    inst.progressFill.classList.remove('spb-pulse-red');
                });
            } else if (activeFinish === 'fade_text_only') {
                barInstances.forEach(inst => {
                    inst.progressFill.classList.remove('spb-pulse-red');
                    inst.textOverlay.classList.remove('spb-active');
                    inst.textOverlay.classList.add('spb-fade-out');
                    inst.textOverlay.style.opacity = '0';
                });
            } else {
                triggerFadeOutNow();
            }
        }, 400);
    }

    function triggerFadeOutNow() {
        if (fadeTimeoutId) clearTimeout(fadeTimeoutId);

        const activeFinish = FINISH_KEYS[finishBehaviorIdx] || 'fade';

        barInstances.forEach(inst => {
            if (activeFinish !== 'fade_text_only') {
                inst.progressFill.classList.remove('spb-active');
                inst.progressFill.classList.add('spb-fade-out');
                inst.progressFill.style.opacity = '0';
            }

            inst.textOverlay.classList.remove('spb-active');
            inst.textOverlay.classList.add('spb-fade-out');
            inst.textOverlay.style.opacity = '0';
        });

        fadeTimeoutId = setTimeout(() => {
            stopAnimation();
        }, fadeDurationSec * 1000);
    }

    function restoreLastState() {
        if (fadeTimeoutId) {
            clearTimeout(fadeTimeoutId);
            fadeTimeoutId = null;
        }

        const activeFinish = FINISH_KEYS[finishBehaviorIdx];

        if (isInterrupted) {
			const activeInterrupt = INTERRUPT_KEYS[interruptBehaviorIdx] || 'red_text_red_bar';

            barInstances.forEach(inst => {
                inst.progressFill.style.setProperty('width', visualPct.toFixed(2) + '%', 'important');
                
                if (activeInterrupt === 'text_red_bar' || activeInterrupt === 'red_text_red_bar') {
                    inst.progressFill.style.background = '#dc2626';
                    inst.progressFill.style.animation = 'none';
                } else {
                    applyProgressBarStyle(inst.progressFill);
                }

                if (activeInterrupt === 'red_text' || activeInterrupt === 'red_text_red_bar') {
                    inst.textOverlay.classList.add('spb-text-interrupted');
                } else {
                    inst.textOverlay.classList.remove('spb-text-interrupted');
                }

                if (activeFinish === 'fade') {
                    inst.progressFill.classList.remove('spb-active');
                    inst.progressFill.classList.add('spb-fade-out');
                    inst.progressFill.style.opacity = '0';
                } else {
                    inst.progressFill.classList.remove('spb-fade-out');
                    inst.progressFill.classList.add('spb-active');
                    inst.progressFill.style.opacity = '1';
                }

                if (activeFinish === 'keep') {
                    inst.textOverlay.classList.remove('spb-fade-out');
                    inst.textOverlay.classList.add('spb-active');
                    inst.textOverlay.style.opacity = '1';
                } else {
                    inst.textOverlay.classList.remove('spb-active');
                    inst.textOverlay.classList.add('spb-fade-out');
                    inst.textOverlay.style.opacity = '0';
                }
            });
            updateOverlayTextFormatted(visualPct, 0);
		} else if (isFinished) {
            barInstances.forEach(inst => {
                inst.progressFill.style.setProperty('width', '100%', 'important');
                applyProgressBarStyle(inst.progressFill);

                if (activeFinish === 'fade') {
                    inst.progressFill.classList.remove('spb-active');
                    inst.progressFill.classList.add('spb-fade-out');
                    inst.progressFill.style.opacity = '0';
                } else {
                    inst.progressFill.classList.remove('spb-fade-out');
                    inst.progressFill.classList.add('spb-active');
                    inst.progressFill.style.opacity = '1';
                }

                if (activeFinish === 'keep') {
                    inst.textOverlay.classList.remove('spb-fade-out');
                    inst.textOverlay.classList.add('spb-active');
                    inst.textOverlay.style.opacity = '1';
                } else {
                    inst.textOverlay.classList.remove('spb-active');
                    inst.textOverlay.classList.add('spb-fade-out');
                    inst.textOverlay.style.opacity = '0';
                }
            });
            updateOverlayTextFormatted(100, 0);
        }
    }

    function restoreKeepFilledNow() {
        restoreLastState();
    }

    function completeAnimation() {
        if (isCompleting) return;
        isCompleting = true;

        if (animFrameId) {
            cancelAnimationFrame(animFrameId);
            animFrameId = null;
        }

        if (totalSteps > 0) {
            currentStep = totalSteps;
        }

        isFinished = true;
        visualPct = 100;
        updateOverlayTextFormatted(100, 0);

        barInstances.forEach(inst => {
            inst.progressFill.classList.add('spb-smooth-complete');
            inst.progressFill.style.width = '100%';
            inst.progressFill.style.opacity = '1';
            inst.textOverlay.style.opacity = '1';
        });

        if (completeTimeoutId) clearTimeout(completeTimeoutId);
        completeTimeoutId = setTimeout(() => {
            barInstances.forEach(inst => inst.progressFill.classList.add('spb-pulse'));
            
            completeTimeoutId = setTimeout(() => {
                const activeFinish = FINISH_KEYS[finishBehaviorIdx] || 'fade';

                if (activeFinish === 'keep') {
                    barInstances.forEach(inst => {
                        inst.progressFill.classList.remove('spb-pulse', 'spb-smooth-complete');
                    });
                    isGenerating = false;
                    isCompleting = false;
                } else if (activeFinish === 'fade_text_only') {
                    barInstances.forEach(inst => {
                        inst.progressFill.classList.remove('spb-pulse', 'spb-smooth-complete');
                    });
                    
                    if (fadeTimeoutId) clearTimeout(fadeTimeoutId);
                    fadeTimeoutId = setTimeout(() => {
                        if (!isGenerating || isFinished) {
                            isGenerating = false;
                            isCompleting = false;
                            triggerFadeOutNow(); // fade text only
                        }
                    }, 150);
                } else {
                    if (fadeTimeoutId) clearTimeout(fadeTimeoutId);
                    fadeTimeoutId = setTimeout(() => {
                        if (!isGenerating || isFinished) {
                            triggerFadeOutNow(); // fade text and bar
                        }
                    }, 150);
                }
            }, 300);
        }, 300);
    }

    function animate(currentTime) {
        if (!isGenerating || isCompleting) return;

        if (!lastFrameTime) lastFrameTime = currentTime;
        const dtMs = Math.min(currentTime - lastFrameTime, 100);
        lastFrameTime = currentTime;

        let displayEta = 0;

        // --- Option 0: Smooth > Accurate ---
        if (smoothnessIdx === 0) {
            const now = performance.now();
            const timePassedSinceUpdateSec = (now - lastServerUpdateMs) / 1000;
            const remainingTimeSec = Math.max(0, currentEtaSec - timePassedSinceUpdateSec);
            const remainingDistancePct = Math.max(0, 100 - visualPct);

            const targetSpeedPctPerMs = remainingDistancePct / (Math.max(0.1, remainingTimeSec) * 1000);

            if (currentSpeedPctPerMs === 0) {
                currentSpeedPctPerMs = targetSpeedPctPerMs;
            } else {
                currentSpeedPctPerMs += (targetSpeedPctPerMs - currentSpeedPctPerMs) * 0.05;
            }

            visualPct += currentSpeedPctPerMs * dtMs;
            visualPct = Math.min(visualPct, 99.2);

            displayEta = Math.ceil(remainingTimeSec);
        }
        // --- Option 1: Smooth ~ Accurate ---
        else if (smoothnessIdx === 1) {
            const frameRatio = dtMs / 16.666;
            const distancePct = targetPct - visualPct;

            if (distancePct > 0) {
                const SPRING_STIFFNESS = 0.035;
                const lerpFactor = 1 - Math.pow(1 - SPRING_STIFFNESS, frameRatio);
                visualPct += distancePct * lerpFactor;
            } else {
                const COAST_SPEED_PER_FRAME = 0.008;
                visualPct += COAST_SPEED_PER_FRAME * frameRatio;
            }

            visualPct = Math.min(visualPct, 99.2);

            const now = performance.now();
            const timePassedSinceUpdateSec = (now - lastServerUpdateMs) / 1000;
            const remainingTimeSec = Math.max(0, currentEtaSec - timePassedSinceUpdateSec);
            displayEta = Math.ceil(remainingTimeSec);
        }
        // --- Option 2: Smooth < Accurate ---
        else if (smoothnessIdx === 2) {
            const now = performance.now();
            const timePassedSinceUpdateMs = now - lastServerUpdateMs;

            let actualStepPct = 0;
            if (totalSteps > 0) {
                actualStepPct = (currentStep / totalSteps) * 100;
            } else {
                actualStepPct = targetPct;
            }

            let predictedExtrapolationPct = 0;
            if (totalSteps > 0 && currentEtaSec > 0) {
                const stepDurationMs = (currentEtaSec * 1000) / Math.max(1, (totalSteps - currentStep));
                const expectedNextStepPct = ((currentStep + 1) / totalSteps) * 100;
                const progressInCurrentStep = Math.min(1, timePassedSinceUpdateMs / Math.max(100, stepDurationMs));
                
                predictedExtrapolationPct = actualStepPct + (expectedNextStepPct - actualStepPct) * progressInCurrentStep * 0.8;
            } else {
                predictedExtrapolationPct = actualStepPct;
            }

            const desiredTargetPct = Math.min(Math.max(actualStepPct, predictedExtrapolationPct), 99.2);

            const lagDifference = desiredTargetPct - visualPct;
            let lerpFactor = 0.08;

            if (lagDifference > 15) {
                lerpFactor = 0.25;
            } else if (lagDifference < 0) {
                lerpFactor = 0.03;
            }

            visualPct += lagDifference * (1 - Math.exp(-lerpFactor * (dtMs / 16.66)));
            visualPct = Math.min(Math.max(0, visualPct), 99.2);

            const timePassedSinceUpdateSec = timePassedSinceUpdateMs / 1000;
            const remainingTimeSec = Math.max(0, currentEtaSec - timePassedSinceUpdateSec);
            displayEta = Math.ceil(remainingTimeSec);
        }

        // --- Common UI Update ---
        barInstances.forEach(inst => {
            inst.progressFill.classList.add('spb-active');
            inst.progressFill.style.opacity = '1';
            inst.progressFill.style.width = visualPct.toFixed(2) + '%';

            inst.textOverlay.classList.add('spb-active');
            inst.textOverlay.style.opacity = '1';

            applyProgressBarStyle(inst.progressFill);
        });

        // Determine overlay display text percentage
        const textDisplayPct = (smoothnessIdx === 2 && totalSteps > 0) 
            ? Math.max(visualPct, (currentStep / totalSteps) * 100) 
            : visualPct;

        updateOverlayTextFormatted(textDisplayPct, displayEta);

        if (visualPct >= 99.9) {
            completeAnimation();
            return;
        }

        animFrameId = requestAnimationFrame(animate);
    }

    async function fetchBackendProgress() {
        try {
            const res = await fetch('/smooth-progress/api');
            if (!res.ok) return;
            const data = await res.json();

            // Handle backend interrupt flag
            if (data.interrupted) {
                if (isGenerating && (visualPct > 0 || lastServerUpdateMs > 0)) {
                    triggerInterruptedState();
                }
                return;
            }

            // Handle inactive state
            if (!data.active || (data.step === 0 && data.progress === 0)) {
				if (isGenerating && !isCompleting && !isInterrupted) {
					if (visualPct > 0 || lastServerUpdateMs > 0) {
						completeAnimation();
					}
				} else if (!isGenerating && !isInterrupted && (FINISH_KEYS[finishBehaviorIdx] === 'keep' || FINISH_KEYS[finishBehaviorIdx] === 'fade_text_only') && !isFinished) {
					restoreKeepFilledNow();
					if (FINISH_KEYS[finishBehaviorIdx] === 'fade_text_only') {
						triggerFadeOutNow();
					}
				}
				return;
			}

            // --- Detect new item start in a batch ---
            const isNewBatchItem = (isFinished || isInterrupted || isCompleting) || 
                                   (data.step < currentStep) || 
                                   (data.step <= 1 && visualPct > 10);

            if (isNewBatchItem) {
                if (fadeTimeoutId) {
                    clearTimeout(fadeTimeoutId);
                    fadeTimeoutId = null;
                }
                
                isInterrupted = false;
                isCompleting = false;
                isFinished = false;
                triggerInitialCalculatingState();
            }

            // --- Normal progress update ---
            const now = performance.now();
            isGenerating = true;

            targetPct = data.progress * 100;
            currentStep = data.step || 0;
            totalSteps = data.total_steps || 0;
            currentEtaSec = data.eta || 0;
            lastServerUpdateMs = now;

            if (!animFrameId) {
                lastFrameTime = 0;
                animFrameId = requestAnimationFrame(animate);
            }

        } catch (e) {
            // Ignore network errors
        }
    }

    onUiLoaded(() => {
        injectUI();
        pollTimer = setInterval(fetchBackendProgress, 100);
    });
})();