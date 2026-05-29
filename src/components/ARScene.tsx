"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export default function ARScene() {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [started, setStarted] = useState(false);
    const [userName, setUserName] = useState("");
    const [wishText, setWishText] = useState("ඔබට පින්බර වෙසක් මංගල්යයක් වේවා!");
    const [sparks, setSparks] = useState<{ id: number; left: string; delay: string; duration: string; size: string }[]>([]);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const [isTargetVisible, setIsTargetVisible] = useState(false);
    const [hasBeenDetected, setHasBeenDetected] = useState(false);
    const [isPeeking, setIsPeeking] = useState(false);

    // Update greeting whenever name changes
    useEffect(() => {
        if (userName.trim()) {
            setWishText(`ඔබට පින්බර වෙසක් මංගල්‍යයක් වේවා, ${userName.trim()}!`);
        } else {
            setWishText("ඔබට පින්බර වෙසක් මංගල්‍යයක් වේවා!");
        }
    }, [userName]);

    useEffect(() => {
        const generatedSparks = Array.from({ length: 22 }).map((_, i) => ({
            id: i,
            left: `${Math.random() * 100}%`,
            delay: `${Math.random() * 7}s`,
            duration: `${6 + Math.random() * 6}s`,
            size: `${3 + Math.random() * 5}px`,
        }));
        setSparks(generatedSparks);
    }, []);

    useEffect(() => {
        const handleFullscreenChange = () => {
            const isFullscreen = !!(
                document.fullscreenElement ||
                (document as any).webkitFullscreenElement ||
                (document as any).mozFullScreenElement ||
                (document as any).msFullscreenElement
            );
            if (!isFullscreen && started) {
                setStarted(false);
            }
        };

        document.addEventListener("fullscreenchange", handleFullscreenChange);
        document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
        document.addEventListener("mozfullscreenchange", handleFullscreenChange);
        document.addEventListener("MSFullscreenChange", handleFullscreenChange);

        return () => {
            document.removeEventListener("fullscreenchange", handleFullscreenChange);
            document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
            document.removeEventListener("mozfullscreenchange", handleFullscreenChange);
            document.removeEventListener("MSFullscreenChange", handleFullscreenChange);
        };
    }, [started]);

    const saveUserToCSV = async (name: string) => {
        try {
            await fetch('/api/log-ar-user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name }),
            });
        } catch (err) {
            console.warn('Failed to save user to CSV:', err);
        }
    };

    const handleStart = async () => {
        // Fire-and-forget CSV save so AR launches immediately
        if (userName.trim()) {
            saveUserToCSV(userName.trim());
        }

        try {
            const docEl = document.documentElement;
            if (docEl.requestFullscreen) {
                await docEl.requestFullscreen();
            } else if ((docEl as any).webkitRequestFullscreen) {
                await (docEl as any).webkitRequestFullscreen();
            } else if ((docEl as any).mozRequestFullScreen) {
                await (docEl as any).mozRequestFullScreen();
            } else if ((docEl as any).msRequestFullscreen) {
                await (docEl as any).msRequestFullscreen();
            }
        } catch (err) {
            console.warn("Fullscreen request skipped or blocked by browser:", err);
        }

        if (!audioRef.current) {
            audioRef.current = new Audio("/audio/vesakSong.mp3");
            audioRef.current.loop = true;
            audioRef.current.load();
        }

        setStarted(true);
    };

    const handleExit = async () => {
        try {
            if (document.fullscreenElement || (document as any).webkitFullscreenElement) {
                if (document.exitFullscreen) {
                    await document.exitFullscreen();
                } else if ((document as any).webkitExitFullscreen) {
                    await (document as any).webkitExitFullscreen();
                } else if ((document as any).mozCancelFullScreen) {
                    await (document as any).mozCancelFullScreen();
                } else if ((document as any).msExitFullscreen) {
                    await (document as any).msExitFullscreen();
                }
            }
        } catch (err) {
            console.warn("Exit fullscreen failed:", err);
        }

        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }

        setStarted(false);
    };

    useEffect(() => {
        if (!started || !containerRef.current) return;

        let mindarThree: any;
        let rendererRef: THREE.WebGLRenderer | null = null;
        let streamRef: MediaStream | null = null;
        const containerEl = containerRef.current;

        const start = async () => {
            const { MindARThree } = await import(
                "mind-ar/dist/mindar-image-three.prod.js"
            );

            mindarThree = new MindARThree({
                container: containerRef.current,
                imageTargetSrc: "/targets/vesak.mind",
                filterMinCF: 0.001,
                filterBeta: 0.5,
                missTolerance: 10,
                warmupTolerance: 8,
            });

            const { renderer, scene, camera } = mindarThree;
            rendererRef = renderer;

            // ── Tone mapping exposure adjusted to 1.0 to keep colors rich and saturated without clipping to white ──
            renderer.toneMapping = THREE.ACESFilmicToneMapping;
            renderer.toneMappingExposure = 1.0;
            renderer.outputColorSpace = THREE.SRGBColorSpace;

            // ── Base scene lighting (keep subtle so colored lights dominate) ──
            const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444466, 0.5);
            scene.add(hemiLight);

            const ambientLight = new THREE.AmbientLight(0xffeedd, 0.2);
            scene.add(ambientLight);

            // ── Highly saturated, pure festive color palette (no washed-out tones) ──
            const festiveColors = [
                new THREE.Color(1.0, 0.0, 0.0),     // pure red
                new THREE.Color(1.0, 0.85, 0.0),    // clear yellow/gold
                new THREE.Color(0.0, 1.0, 0.1),     // clear green
                new THREE.Color(0.0, 0.3, 1.0),     // clear blue
                new THREE.Color(1.0, 0.0, 0.8),     // clear magenta
            ];

            const COLOR_CHANGE_SPEED = 0.01;

            let colorIndex = 0;
            let nextColorIndex = 1;
            let lerpT = 0;

            const anchor = mindarThree.addAnchor(0);

            const modelContainer = new THREE.Group();
            modelContainer.rotation.x = Math.PI / 2;
            anchor.group.add(modelContainer);

            // ── Create a radial-gradient glow texture for visible light sprites ──
            const makeGlowTexture = (size: number = 256): THREE.Texture => {
                const canvas = document.createElement("canvas");
                canvas.width = size;
                canvas.height = size;
                const ctx = canvas.getContext("2d")!;
                const grad = ctx.createRadialGradient(
                    size / 2, size / 2, 0,
                    size / 2, size / 2, size / 2
                );
                // Clean grayscale gradient works perfectly with NormalBlending to display pure colors
                grad.addColorStop(0, "rgba(255,255,255,1.0)");
                grad.addColorStop(0.2, "rgba(255,255,255,0.6)");
                grad.addColorStop(0.5, "rgba(255,255,255,0.25)");
                grad.addColorStop(1, "rgba(255,255,255,0)");
                ctx.fillStyle = grad;
                ctx.fillRect(0, 0, size, size);
                const tex = new THREE.CanvasTexture(canvas);
                tex.needsUpdate = true;
                return tex;
            };

            const glowTexture = makeGlowTexture(256);

            // ── MAIN VISIBLE GLOW SPRITE — NormalBlending prevents color overlay from washing out to white ──
            const mainGlowMat = new THREE.SpriteMaterial({
                map: glowTexture,
                color: 0xffffff,
                transparent: true,
                opacity: 0.8,
                blending: THREE.NormalBlending,
                depthWrite: false,
            });
            const mainGlow = new THREE.Sprite(mainGlowMat);
            mainGlow.scale.set(0.8, 0.8, 1);
            mainGlow.position.set(0, 0.5, 0);
            modelContainer.add(mainGlow);

            // ── SECONDARY OUTER GLOW — softer, larger halo ring ──
            const outerGlowMat = new THREE.SpriteMaterial({
                map: glowTexture,
                color: 0xffffff,
                transparent: true,
                opacity: 0.4,
                blending: THREE.NormalBlending,
                depthWrite: false,
            });
            const outerGlow = new THREE.Sprite(outerGlowMat);
            outerGlow.scale.set(1.2, 1.2, 1);
            outerGlow.position.set(0, 0.5, 0);
            modelContainer.add(outerGlow);

            // ── MAIN COLOR POINT LIGHT — casts vivid color onto the lantern surfaces ──
            const colorLight = new THREE.PointLight(0xffffff, 4.0, 8);
            colorLight.position.set(0, 0.5, 0);
            modelContainer.add(colorLight);

            // ── INNER WARM GLOW — warm core light inside the lantern ──
            const innerGlow = new THREE.PointLight(0xffffff, 2.5, 6);
            innerGlow.position.set(0, 0.3, 0);
            modelContainer.add(innerGlow);

            // ── DIRECTIONAL RIM LIGHT — adds specular highlights so surfaces catch the color ──
            const rimLight = new THREE.DirectionalLight(0xffffff, 1.2);
            rimLight.position.set(2, 3, 2);
            modelContainer.add(rimLight);

            anchor.onTargetFound = () => {
                setIsTargetVisible(true);
                setHasBeenDetected(true);
                if (audioRef.current) {
                    audioRef.current.play().catch(e => console.warn("Audio playback failed:", e));
                }
            };

            anchor.onTargetLost = () => {
                setIsTargetVisible(false);
                if (audioRef.current) {
                    audioRef.current.pause();
                }
            };

            const loader = new GLTFLoader();
            loader.load(
                "/models/VLSSL.glb",
                (gltf: any) => {
                    const model = gltf.scene;
                    model.scale.set(0.6, 0.6, 0.6);

                    const box = new THREE.Box3().setFromObject(model);
                    const center = new THREE.Vector3();
                    box.getCenter(center);

                    model.position.x = -center.x;
                    model.position.z = -center.z;
                    model.position.y = -box.min.y;

                    // Make model materials more receptive to colored lighting
                    model.traverse((child: any) => {
                        if (child.isMesh && child.material) {
                            const mat = child.material;
                            if (mat.isMeshStandardMaterial || mat.isMeshPhysicalMaterial) {
                                mat.roughness = Math.min(mat.roughness, 0.65);
                                mat.metalness = Math.max(mat.metalness, 0.15);
                                mat.envMapIntensity = 0.5;
                                mat.needsUpdate = true;
                            }
                        }
                    });

                    modelContainer.add(model);

                    // Individual spin speeds per sub-lantern (matches Blender pivot)
                    const SUB_LANTERN_SPEEDS: Record<string, number> = {
                        sublantern1: 0.018,
                        sublantern2: -0.022,
                        sublantern3: 0.030,
                        sublantern4: -0.016,
                        sublantern5: 0.025,
                        sublantern6: -0.028,
                        sublantern7: 0.020,
                        sublantern8: -0.014,
                    };

                    const subLanterns: Map<string, THREE.Object3D> = new Map();
                    model.traverse((obj: THREE.Object3D) => {
                        const name = obj.name.toLowerCase();
                        if (name.startsWith("sublantern")) {
                            subLanterns.set(name, obj);
                        }
                    });

                    const currentColor = new THREE.Color();
                    const time = { value: 0 };

                    renderer.setAnimationLoop(() => {
                        time.value += 0.016;
                        model.rotation.y += 0.010; // faster main rotation

                        subLanterns.forEach((lantern, name) => {
                            lantern.rotation.y += (SUB_LANTERN_SPEEDS[name] ?? 0.01) * 0.8;
                        });

                        // ── smooth color transition ──
                        lerpT += COLOR_CHANGE_SPEED * 0.6; // slower color shifting

                        if (lerpT >= 1) {
                            lerpT = 0;
                            colorIndex = nextColorIndex;
                            nextColorIndex = (nextColorIndex + 1) % festiveColors.length;
                        }

                        currentColor.lerpColors(
                            festiveColors[colorIndex],
                            festiveColors[nextColorIndex],
                            lerpT
                        );

                        colorLight.color.copy(currentColor);
                        innerGlow.color.copy(currentColor); // color inside matches outside color
                        mainGlowMat.color.copy(currentColor);
                        outerGlowMat.color.copy(currentColor);
                        rimLight.color.copy(currentColor);

                        // ── SOFT PULSE SYSTEM (reduced amplitude + smoothed) ──
                        const t = time.value;

                        // gentler waves (less contrast, more calm breathing)
                        const pulse1 = (Math.sin(t * 1.2) * 0.5 + 0.5) * 0.6 + 0.2;
                        const pulse2 = (Math.sin(t * 0.9 + 1.5) * 0.5 + 0.5) * 0.5 + 0.3;
                        const pulse3 = (Math.sin(t * 0.6 + 2.0) * 0.5 + 0.5) * 0.4 + 0.3;

                        // ── LIGHT INTENSITIES (reduced range) ──
                        colorLight.intensity = 3.0 + pulse1 * 1.5;   // was 3.5 → 5.5
                        innerGlow.intensity = 1.5 + pulse2 * 1.0;    // softer core glow
                        rimLight.intensity = 0.6 + pulse1 * 0.6;     // subtle rim light

                        // ── MAIN GLOW (tighter pulse radius and lower scale) ──
                        const glowScale = 0.8 + pulse1 * 0.2;        // tighter scale (0.8 to 1.0)
                        mainGlow.scale.set(glowScale, glowScale, 1);
                        mainGlowMat.opacity = 0.6 + pulse1 * 0.15;   // no harsh flashing

                        // ── OUTER GLOW (very subtle halo motion) ──
                        const outerScale = 1.3 + pulse3 * 0.3;       // tighter outer halo (1.3 to 1.6)
                        outerGlow.scale.set(outerScale, outerScale, 1);
                        outerGlowMat.opacity = 0.25 + pulse3 * 0.1;

                        renderer.render(scene, camera);
                    });
                }
            );

            await mindarThree.start();

            try {
                const video = mindarThree.video;
                if (video && video.srcObject) {
                    streamRef = video.srcObject as MediaStream;
                }
            } catch (_) { }

            try {
                const video = mindarThree.video;
                if (video && video.srcObject) {
                    const stream = video.srcObject as MediaStream;
                    const track = stream.getVideoTracks()[0];
                    if (track) {
                        const constraints: any = {};
                        const capabilities = (track as any).getCapabilities?.();
                        if (capabilities?.focusMode?.includes("continuous")) {
                            constraints.focusMode = "continuous";
                        } else if (capabilities?.focusMode?.includes("single-shot")) {
                            constraints.focusMode = "single-shot";
                        }
                        if (capabilities?.width?.max) {
                            constraints.width = { ideal: Math.min(capabilities.width.max, 1920) };
                        }
                        if (capabilities?.height?.max) {
                            constraints.height = { ideal: Math.min(capabilities.height.max, 1080) };
                        }
                        if (Object.keys(constraints).length > 0) {
                            await track.applyConstraints(constraints);
                        }
                    }
                }
            } catch (err) {
                console.warn("AR Camera: Autofocus/resolution constraints not supported on this device", err);
            }
        };

        start();

        return () => {
            if (rendererRef) {
                rendererRef.setAnimationLoop(null);
            }
            if (mindarThree) {
                try { mindarThree.stop(); } catch (_) { }
            }
            if (streamRef) {
                streamRef.getTracks().forEach(track => track.stop());
            }
            if (rendererRef) {
                rendererRef.dispose();
            }
            if (containerEl) {
                const leftoverVideos = containerEl.querySelectorAll("video");
                leftoverVideos.forEach(v => {
                    if (v.srcObject) {
                        (v.srcObject as MediaStream).getTracks().forEach(t => t.stop());
                        v.srcObject = null;
                    }
                    v.remove();
                });
                const leftoverCanvases = containerEl.querySelectorAll("canvas");
                leftoverCanvases.forEach(c => c.remove());
            }
            setIsTargetVisible(false);
            setHasBeenDetected(false);
        };
    }, [started]);

    // ─── AR VIEW ────────────────────────────────────────────────────────────────
    if (started) {
        return (
            <div
                ref={containerRef}
                className="ar-root"
                style={{
                    width: "100vw",
                    height: "100vh",
                    position: "fixed",
                    top: 0,
                    left: 0,
                    zIndex: 9999,
                    backgroundColor: "#000",
                }}
            >
                <style>{`
                    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&family=DM+Sans:wght@300;400;500;600&display=swap');

                    :root {
                        --gold: #C9A84C;
                        --gold-light: #E8C96A;
                        --gold-muted: rgba(201,168,76,0.18);
                        --surface: rgba(10, 9, 14, 0.72);
                        --border: rgba(201,168,76,0.22);
                        --text-primary: #F0EBE1;
                        --text-secondary: rgba(240,235,225,0.55);
                    }

                    .ar-root video,
                    .ar-root canvas {
                        max-width: none !important;
                        max-height: none !important;
                    }

                    .ar-back-btn {
                        position: absolute;
                        top: 22px;
                        left: 20px;
                        z-index: 10000;
                        display: flex;
                        align-items: center;
                        gap: 7px;
                        padding: 10px 18px;
                        font-family: 'DM Sans', sans-serif;
                        font-size: 13px;
                        font-weight: 500;
                        color: var(--text-primary);
                        background: var(--surface);
                        backdrop-filter: blur(18px);
                        -webkit-backdrop-filter: blur(18px);
                        border: 1px solid var(--border);
                        border-radius: 100px;
                        cursor: pointer;
                        letter-spacing: 0.3px;
                        transition: background 0.25s, border-color 0.25s;
                    }
                    .ar-back-btn:hover {
                        background: rgba(201,168,76,0.14);
                        border-color: var(--gold);
                    }
                    .ar-back-arrow {
                        font-size: 15px;
                        line-height: 1;
                        opacity: 0.7;
                    }

                    .ar-status-pill {
                        position: absolute;
                        top: 22px;
                        right: 20px;
                        z-index: 10000;
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        padding: 9px 16px;
                        font-family: 'DM Sans', sans-serif;
                        font-size: 12px;
                        font-weight: 500;
                        letter-spacing: 0.6px;
                        text-transform: uppercase;
                        color: var(--text-primary);
                        background: var(--surface);
                        backdrop-filter: blur(18px);
                        -webkit-backdrop-filter: blur(18px);
                        border: 1px solid var(--border);
                        border-radius: 100px;
                    }
                    .ar-status-led {
                        width: 7px;
                        height: 7px;
                        border-radius: 50%;
                        flex-shrink: 0;
                    }
                    .ar-status-led.tracked {
                        background: #4ade80;
                        box-shadow: 0 0 8px #4ade80;
                        animation: ledPulse 1.8s ease-in-out infinite;
                    }
                    .ar-status-led.searching {
                        background: var(--gold);
                        box-shadow: 0 0 8px var(--gold);
                        animation: ledPulse 1.2s ease-in-out infinite;
                    }
                    @keyframes ledPulse {
                        0%, 100% { opacity: 1; }
                        50% { opacity: 0.4; }
                    }

                    .ar-reticle-wrap {
                        position: absolute;
                        top: 45%;
                        left: 50%;
                        transform: translate(-50%, -50%);
                        z-index: 9998;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        gap: 22px;
                        pointer-events: none;
                    }
                    .ar-reticle-frame {
                        width: 230px;
                        height: 230px;
                        position: relative;
                        animation: frameBreath 2.4s ease-in-out infinite;
                    }
                    .ar-reticle-frame .c {
                        position: absolute;
                        width: 22px;
                        height: 22px;
                        border-color: var(--gold-light);
                        border-style: solid;
                        border-width: 0;
                    }
                    .ar-reticle-frame .c.tl { top: 0; left: 0; border-top-width: 2px; border-left-width: 2px; border-radius: 4px 0 0 0; }
                    .ar-reticle-frame .c.tr { top: 0; right: 0; border-top-width: 2px; border-right-width: 2px; border-radius: 0 4px 0 0; }
                    .ar-reticle-frame .c.bl { bottom: 0; left: 0; border-bottom-width: 2px; border-left-width: 2px; border-radius: 0 0 0 4px; }
                    .ar-reticle-frame .c.br { bottom: 0; right: 0; border-bottom-width: 2px; border-right-width: 2px; border-radius: 0 0 4px 0; }
                    .ar-reticle-inner-ring {
                        position: absolute;
                        inset: 20px;
                        border: 1px solid rgba(201,168,76,0.15);
                        border-radius: 8px;
                    }
                    @keyframes frameBreath {
                        0%, 100% { opacity: 0.7; transform: scale(1); }
                        50% { opacity: 1; transform: scale(1.025); }
                    }
                    .ar-reticle-label {
                        font-family: 'DM Sans', sans-serif;
                        font-size: 12px;
                        font-weight: 400;
                        letter-spacing: 0.8px;
                        text-transform: uppercase;
                        color: var(--text-primary);
                        background: var(--surface);
                        backdrop-filter: blur(14px);
                        -webkit-backdrop-filter: blur(14px);
                        border: 1px solid var(--border);
                        border-radius: 100px;
                        padding: 9px 20px;
                    }

                    .ar-restore-banner {
                        position: absolute;
                        bottom: 130px;
                        left: 50%;
                        transform: translateX(-50%);
                        z-index: 10000;
                        width: max-content;
                        max-width: 88%;
                        background: rgba(201,168,76,0.09);
                        backdrop-filter: blur(12px);
                        -webkit-backdrop-filter: blur(12px);
                        border: 1px solid rgba(201,168,76,0.3);
                        border-radius: 12px;
                        padding: 10px 18px;
                        font-family: 'DM Sans', sans-serif;
                        font-size: 12px;
                        font-weight: 400;
                        color: rgba(232,201,106,0.9);
                        text-align: center;
                        animation: bannerIn 0.5s cubic-bezier(0.16,1,0.3,1);
                    }
                    @keyframes bannerIn {
                        from { opacity: 0; transform: translateX(-50%) translateY(12px); }
                        to   { opacity: 1; transform: translateX(-50%) translateY(0); }
                    }

                    .ar-wish-card {
                        position: absolute;
                        bottom: 28px;
                        left: 50%;
                        transform: translateX(-50%);
                        z-index: 10000;
                        width: 91%;
                        max-width: 430px;
                        background: var(--surface);
                        backdrop-filter: blur(22px);
                        -webkit-backdrop-filter: blur(22px);
                        border: 1px solid var(--border);
                        border-radius: 20px;
                        padding: 18px 20px;
                        display: grid;
                        grid-template-columns: auto 1fr;
                        gap: 14px;
                        align-items: start;
                        animation: wishIn 0.55s cubic-bezier(0.16,1,0.3,1);
                    }
                    @keyframes wishIn {
                        from { opacity: 0; transform: translateX(-50%) translateY(20px); }
                        to   { opacity: 1; transform: translateX(-50%) translateY(0); }
                    }
                    .ar-wish-icon-wrap {
                        width: 42px;
                        height: 42px;
                        border-radius: 12px;
                        background: var(--gold-muted);
                        border: 1px solid rgba(201,168,76,0.3);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 20px;
                        flex-shrink: 0;
                        animation: iconFloat 3.2s ease-in-out infinite;
                    }
                    @keyframes iconFloat {
                        0%, 100% { transform: translateY(0); }
                        50% { transform: translateY(-4px); }
                    }
                    .ar-wish-name {
                        font-family: 'Cormorant Garamond', serif;
                        font-size: 17px;
                        font-weight: 600;
                        color: var(--gold-light);
                        margin: 0 0 5px 0;
                        line-height: 1.2;
                    }
                    .ar-wish-body {
                        font-family: 'DM Sans', sans-serif;
                        font-size: 12px;
                        font-weight: 300;
                        color: var(--text-secondary);
                        margin: 0;
                        line-height: 1.55;
                        font-style: italic;
                    }

                    .ar-wish-divider {
                        grid-column: 1 / -1;
                        height: 1px;
                        background: var(--border);
                        margin: 2px 0 0;
                        display: none;
                    }

                    .dev-footer {
                        position: absolute;
                        bottom: 12px;
                        left: 50%;
                        transform: translateX(-50%);
                        z-index: 10005;
                        font-family: 'DM Sans', sans-serif;
                        font-size: 10px;
                        font-weight: 600;
                        color: var(--gold-light);
                        background: var(--surface);
                        backdrop-filter: blur(12px);
                        -webkit-backdrop-filter: blur(12px);
                        border: 1px solid var(--border);
                        border-radius: 100px;
                        padding: 6px 14px;
                        letter-spacing: 0.8px;
                        text-transform: uppercase;
                        white-space: nowrap;
                        pointer-events: none;
                        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.4);
                    }
                `}</style>

                {!isTargetVisible && !hasBeenDetected && (
                    <div className="ar-reticle-wrap">
                        <div className="ar-reticle-frame">
                            <span className="c tl"></span>
                            <span className="c tr"></span>
                            <span className="c bl"></span>
                            <span className="c br"></span>
                            <div className="ar-reticle-inner-ring"></div>
                        </div>
                        <div className="ar-reticle-label">Align with Vesak QR Code</div>
                    </div>
                )}

                {hasBeenDetected && (
                    <div className="ar-status-pill">
                        <div className={`ar-status-led ${isTargetVisible ? "tracked" : "searching"}`}></div>
                        <span>{isTargetVisible ? "Tracking" : "Searching…"}</span>
                    </div>
                )}

                {hasBeenDetected && !isTargetVisible && (
                    <div className="ar-restore-banner">
                        Point camera at the Vesak QR code to restore the lantern
                    </div>
                )}

                <button className="ar-back-btn" onClick={handleExit}>
                    <span className="ar-back-arrow">←</span>
                    <span>Exit AR</span>
                </button>

                <div className="ar-wish-card">
                    <div className="ar-wish-icon-wrap">🪔</div>
                    <div>
                        <p className="ar-wish-name">
                            Happy Vesak{userName ? `, ${userName}` : ""}
                        </p>
                        <p className="ar-wish-body">{wishText}</p>
                    </div>
                </div>

                <div className="dev-footer">developed by Amandi and Ihan</div>
            </div>
        );
    }

    // ─── WELCOME SCREEN ─────────────────────────────────────────────────────────
    return (
        <div className={`intro-root ${isPeeking ? "peeking" : ""}`}>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&family=DM+Sans:wght@300;400;500;600&family=Noto+Sans+Sinhala:wght@300;400;500;600&display=swap');

                :root {
                    --bg:          #0A090E;
                    --surface-1:   #111018;
                    --surface-2:   #18161F;
                    --border:      #18161F;
                    --border-hover:rgba(201,168,76,0.5);
                    --gold:        #C9A84C;
                    --gold-light:  #E8C96A;
                    --gold-dim:    rgba(201,168,76,0.12);
                    --gold-glow:   rgba(201,168,76,0.28);
                    --text-1:      #F0EBE1;
                    --text-2:      rgba(240,235,225,0.5);
                    --text-3:      rgba(240,235,225,0.3);
                    --sinhala:     'Noto Sans Sinhala', sans-serif;
                }

                * { box-sizing: border-box; margin: 0; padding: 0; }

                .intro-root {
                    width: 100vw;
                    height: 100vh;
                    position: fixed;
                    inset: 0;
                    background: var(--bg);
                    color: var(--text-1);
                    font-family: 'DM Sans', sans-serif;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    overflow: hidden;
                    z-index: 999;
                }

                .intro-bg-image {
                    position: absolute;
                    inset: 0;
                    background: url('/images/buddha.png') no-repeat center center / cover;
                    opacity: 0.4;
                    z-index: 0;
                    transition: opacity 0.5s cubic-bezier(0.16, 1, 0.3, 1);
                }
                .intro-bg-gradient {
                    position: absolute;
                    inset: 0;
                    background:
                        radial-gradient(ellipse 70% 55% at 50% 110%, rgba(201,168,76,0.09) 0%, transparent 70%),
                        radial-gradient(ellipse 100% 60% at 50% 0%, rgba(30,20,50,0.6) 0%, transparent 80%);
                    z-index: 1;
                    pointer-events: none;
                    transition: opacity 0.5s cubic-bezier(0.16, 1, 0.3, 1);
                }

                .intro-sparks {
                    position: absolute;
                    inset: 0;
                    z-index: 2;
                    pointer-events: none;
                    overflow: hidden;
                    transition: opacity 0.5s cubic-bezier(0.16, 1, 0.3, 1);
                }
                .spark {
                    position: absolute;
                    bottom: -12px;
                    border-radius: 50%;
                    background: radial-gradient(circle, rgba(232,201,106,0.9) 0%, transparent 70%);
                    opacity: 0;
                    animation: sparkRise linear infinite;
                }
                @keyframes sparkRise {
                    0%   { opacity: 0; transform: translateY(0) scale(1); }
                    8%   { opacity: 0.65; }
                    88%  { opacity: 0.45; }
                    100% { opacity: 0; transform: translateY(-110vh) translateX(40px) scale(0.3); }
                }

                .lotus-divider {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    margin: 0 0 22px;
                }
                .lotus-line {
                    flex: 1;
                    height: 1px;
                    background: linear-gradient(90deg, transparent, var(--border), transparent);
                }
                .lotus-dot {
                    width: 5px;
                    height: 5px;
                    border-radius: 50%;
                    background: var(--gold);
                    opacity: 0.6;
                }

                .intro-card {
                    position: relative;
                    z-index: 10;
                    width: 92%;
                    max-width: 448px;
                    max-height: 92vh;
                    overflow-y: auto;
                    overflow-x: hidden;
                    background: var(--surface-1);
                    border: 1px solid var(--border);
                    border-radius: 24px;
                    padding: 32px 26px 28px;
                    box-shadow:
                        0 0 0 1px rgba(0,0,0,0.5),
                        0 24px 60px rgba(0,0,0,0.6),
                        0 0 80px rgba(201,168,76,0.04) inset;
                    animation: cardIn 0.7s cubic-bezier(0.16,1,0.3,1) both;
                    scrollbar-width: none;
                    transition: opacity 0.5s cubic-bezier(0.16, 1, 0.3, 1), transform 0.5s cubic-bezier(0.16, 1, 0.3, 1);
                }
                .intro-card::-webkit-scrollbar { display: none; }
                @keyframes cardIn {
                    from { opacity: 0; transform: translateY(24px) scale(0.98); }
                    to   { opacity: 1; transform: translateY(0) scale(1); }
                }

                .intro-root.peeking .intro-card {
                    opacity: 0 !important;
                    transform: translateY(12px) scale(0.97) !important;
                    pointer-events: none !important;
                }
                .intro-root.peeking .intro-bg-image {
                    opacity: 0.4 !important;
                }
                .intro-root.peeking .intro-bg-gradient {
                    opacity: 0 !important;
                }
                .intro-root.peeking .intro-sparks {
                    opacity: 0 !important;
                }
                .intro-root.peeking .bg-peek-btn {
                    background: var(--gold-glow);
                    border-color: var(--gold);
                    color: var(--gold-light);
                    box-shadow: 0 0 20px rgba(201, 168, 76, 0.2);
                }

                .bg-peek-btn {
                    position: absolute;
                    top: 20px;
                    right: 20px;
                    z-index: 1000;
                    display: flex;
                    align-items: center;
                    gap: 7px;
                    padding: 10px 16px;
                    font-family: 'DM Sans', sans-serif;
                    font-size: 11px;
                    font-weight: 500;
                    letter-spacing: 0.4px;
                    color: var(--text-1);
                    background: var(--surface-1);
                    backdrop-filter: blur(18px);
                    -webkit-backdrop-filter: blur(18px);
                    border: 1px solid var(--border);
                    border-radius: 100px;
                    cursor: pointer;
                    user-select: none;
                    -webkit-user-select: none;
                    transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
                }
                .bg-peek-btn:hover {
                    border-color: var(--border-hover);
                    background: rgba(255, 255, 255, 0.04);
                }
                .bg-peek-btn:active {
                    transform: scale(0.96);
                }

                .intro-badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    background: var(--gold-dim);
                    border: 1px solid var(--border);
                    border-radius: 100px;
                    padding: 5px 12px;
                    font-size: 10px;
                    font-weight: 500;
                    letter-spacing: 1.2px;
                    text-transform: uppercase;
                    color: var(--gold);
                    margin-bottom: 16px;
                }
                .intro-badge-dot {
                    width: 5px;
                    height: 5px;
                    border-radius: 50%;
                    background: var(--gold-light);
                    animation: ledPulse2 2s ease-in-out infinite;
                }
                @keyframes ledPulse2 {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.3; }
                }

                .intro-title {
                    font-family: 'Cormorant Garamond', serif;
                    font-size: 32px;
                    font-weight: 700;
                    color: var(--text-1);
                    line-height: 1.15;
                    letter-spacing: -0.3px;
                    margin-bottom: 10px;
                }
                .intro-title em {
                    font-style: italic;
                    color: var(--gold-light);
                }

                .field-label {
                    display: block;
                    font-size: 10px;
                    font-weight: 600;
                    letter-spacing: 1.4px;
                    text-transform: uppercase;
                    color: var(--gold);
                    margin-bottom: 8px;
                    opacity: 0.85;
                }

                .intro-field {
                    margin-bottom: 22px;
                }
                .intro-input {
                    width: 100%;
                    background: var(--surface-2);
                    border: 1px solid rgba(255,255,255,0.07);
                    border-radius: 11px;
                    padding: 12px 14px;
                    font-family: 'DM Sans', sans-serif;
                    font-size: 14px;
                    font-weight: 300;
                    color: var(--text-1);
                    outline: none;
                    transition: border-color 0.2s, box-shadow 0.2s;
                }
                .intro-input::placeholder { color: var(--text-3); }
                .intro-input:focus {
                    border-color: rgba(201,168,76,0.45);
                    box-shadow: 0 0 0 3px rgba(201,168,76,0.08);
                }

                .intro-greeting {
                    margin-bottom: 22px;
                    text-align: center;
                    animation: greetingIn 0.5s cubic-bezier(0.16,1,0.3,1) both;
                }
                .intro-greeting p:first-child {
                    font-family: var(--sinhala);
                    font-size: 15px;
                    font-weight: 500;
                    color: var(--gold-light);
                    line-height: 1.5;
                    margin-bottom: 4px;
                }
                .intro-greeting p:last-child {
                    font-family: var(--sinhala);
                    font-size: 12px;
                    font-weight: 300;
                    color: var(--text-2);
                    line-height: 1.5;
                }
                @keyframes greetingIn {
                    from { opacity: 0; transform: translateY(8px); }
                    to   { opacity: 1; transform: translateY(0); }
                }

                .intro-cta {
                    width: 100%;
                    position: relative;
                    overflow: hidden;
                    background: linear-gradient(135deg, #C9A84C 0%, #E8C96A 48%, #A07830 100%);
                    border: none;
                    border-radius: 13px;
                    padding: 15px 24px;
                    font-family: 'DM Sans', sans-serif;
                    font-size: 15px;
                    font-weight: 600;
                    color: #0A0800;
                    letter-spacing: 0.2px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 9px;
                    box-shadow: 0 4px 20px rgba(201,168,76,0.3), 0 1px 0 rgba(255,255,255,0.15) inset;
                    transition: transform 0.2s, box-shadow 0.2s;
                }
                .intro-cta::after {
                    content: '';
                    position: absolute;
                    inset: 0;
                    background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.25) 50%, transparent 100%);
                    transform: translateX(-100%);
                    transition: transform 0.6s ease;
                }
                .intro-cta:hover { transform: translateY(-2px); box-shadow: 0 8px 28px rgba(201,168,76,0.42); }
                .intro-cta:hover::after { transform: translateX(100%); }
                .intro-cta:active { transform: translateY(1px); box-shadow: 0 2px 10px rgba(201,168,76,0.28); }
                .cta-icon { font-size: 17px; }

                .intro-footer {
                    margin-top: 16px;
                    text-align: center;
                    font-size: 11px;
                    font-weight: 300;
                    color: var(--text-3);
                    letter-spacing: 0.3px;
                }

                @media (max-width: 480px) {
                    .bg-peek-btn {
                        top: 16px;
                        right: 16px;
                        padding: 8px 14px;
                        font-size: 10px;
                    }
                    .intro-card {
                        padding: 24px 20px 22px;
                        border-radius: 20px;
                    }
                    .intro-title {
                        font-size: 26px !important;
                    }
                    .intro-badge {
                        font-size: 9px !important;
                        padding: 4px 10px !important;
                        margin-bottom: 12px !important;
                    }
                    .lotus-divider {
                        margin-bottom: 16px !important;
                    }
                    .intro-field {
                        margin-bottom: 16px !important;
                    }
                    .intro-greeting p:first-child {
                        font-size: 13px;
                    }
                    .intro-greeting p:last-child {
                        font-size: 11px;
                    }
                    .intro-input {
                        padding: 10px 12px !important;
                        font-size: 13px !important;
                        border-radius: 9px !important;
                    }
                    .intro-cta {
                        padding: 13px 20px !important;
                        font-size: 14px !important;
                        border-radius: 11px !important;
                    }
                }

                @media (max-height: 700px) {
                    .intro-card {
                        max-height: 96vh;
                        padding-top: 20px !important;
                        padding-bottom: 18px !important;
                    }
                    .intro-title {
                        font-size: 25px !important;
                        margin-bottom: 6px !important;
                    }
                    .lotus-divider {
                        margin-bottom: 12px !important;
                    }
                    .intro-field {
                        margin-bottom: 12px !important;
                    }
                }

                .dev-footer-welcome {
                    position: absolute;
                    bottom: 16px;
                    left: 50%;
                    transform: translateX(-50%);
                    z-index: 100;
                    font-family: 'DM Sans', sans-serif;
                    font-size: 10px;
                    font-weight: 600;
                    color: var(--gold-light);
                    background: var(--surface-1);
                    backdrop-filter: blur(12px);
                    -webkit-backdrop-filter: blur(12px);
                    border: 1px solid var(--border);
                    border-radius: 100px;
                    padding: 6px 14px;
                    letter-spacing: 0.8px;
                    text-transform: uppercase;
                    white-space: nowrap;
                    pointer-events: none;
                    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.4);
                }
            `}</style>

            <div className="intro-bg-image" />
            <div className="intro-bg-gradient" />

            <button
                className="bg-peek-btn"
                onMouseDown={() => setIsPeeking(true)}
                onMouseUp={() => setIsPeeking(false)}
                onMouseLeave={() => setIsPeeking(false)}
                onTouchStart={(e) => {
                    e.preventDefault();
                    setIsPeeking(true);
                }}
                onTouchEnd={(e) => {
                    e.preventDefault();
                    setIsPeeking(false);
                }}
                onTouchCancel={(e) => {
                    e.preventDefault();
                    setIsPeeking(false);
                }}
            >
                <span>👁️ පසුබිම බලන්න</span>
            </button>

            <div className="intro-sparks">
                {sparks.map((s) => (
                    <div
                        key={s.id}
                        className="spark"
                        style={{
                            left: s.left,
                            animationDelay: s.delay,
                            animationDuration: s.duration,
                            width: s.size,
                            height: s.size,
                        }}
                    />
                ))}
            </div>

            <div className="intro-card">
                <div style={{ marginBottom: 18 }}>
                    <span className="intro-badge">
                        <span className="intro-badge-dot" />
                        Augmented Reality · Vesak 2026
                    </span>
                </div>

                <h1 className="intro-title">
                    AR <em>වෙසක්</em> පහන් කූඩුව
                </h1>

                <div className="lotus-divider">
                    <div className="lotus-line" />
                    <div className="lotus-dot" />
                    <div className="lotus-dot" style={{ opacity: 0.35 }} />
                    <div className="lotus-dot" />
                    <div className="lotus-line" />
                </div>

                {/* Name field */}
                <div className="intro-field">
                    <label className="field-label">ඔබගේ නම</label>
                    <input
                        type="text"
                        className="intro-input"
                        placeholder="නම ඇතුළත් කරන්න…"
                        value={userName}
                        onChange={(e) => setUserName(e.target.value)}
                    />
                </div>

                {/* Live greeting */}
                {userName.trim() && (
                    <div className="intro-greeting">
                        <p>ඔබට පින්බර වෙසක් මංගල්‍යයක් වේවා, {userName.trim()}!</p>
                        <p>පින්බර වෙසක් මංගල්‍යයේ උතුම් ආලෝකය ඔබගේ හදවතත් නිවසත් සදාකාලික සාමයෙන්, සමගියෙන් සහ සතුටෙන් පුරවාලත්වා!</p>
                    </div>
                )}

                <button className="intro-cta" onClick={handleStart}>
                    <span className="cta-icon">✦</span>
                    <span>AR පහන් කූඩුව බලන්න</span>
                </button>

                <p className="intro-footer">Point your camera at the Vesak QR code after launching</p>
            </div>

            <div className="dev-footer-welcome">developed by Amandi and Ihan</div>
        </div>
    );
}