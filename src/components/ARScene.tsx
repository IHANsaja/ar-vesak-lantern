"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

const PRESET_WISHES = [
    {
        id: "peace",
        label: "🕊️ සාමය සහ සමගිය",
        text: "පින්බර වෙසක් මංගල්‍යයේ උතුම් ආලෝකය ඔබගේ හදවතත් නිවසත් සදාකාලික සාමයෙන්, සමගියෙන් සහ සතුටෙන් පුරවාලත්වා!"
    },
    {
        id: "wisdom",
        label: "🪔 ප්‍රඥාව සහ ආලෝකය",
        text: "සම්මා සම්බුදු සරණින් සත්‍යයේ, ප්‍රඥාවේ සහ අභ්‍යන්තර ආලෝකයේ මඟ හෙළිවී ඔබගේ ජීවිතය වාසනාවන්ත වේවා!"
    },
    {
        id: "compassion",
        label: "🌸 කරුණාව සහ ප්‍රීතිය",
        text: "ගෞතම බුදුරජාණන් වහන්සේගේ අපිරිමිත කරුණාව, අසිරිමත් ප්‍රීතිය සහ ප්‍රඥාව ඔබගේ ජීවිතයට සැමදා ලැබේවා!"
    }
];

export default function ARScene() {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [started, setStarted] = useState(false);
    const [userName, setUserName] = useState("");
    const [selectedWishId, setSelectedWishId] = useState("peace");
    const [wishText, setWishText] = useState(PRESET_WISHES[0].text);
    const [sparks, setSparks] = useState<{ id: number; left: string; delay: string; duration: string; size: string }[]>([]);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const [isTargetVisible, setIsTargetVisible] = useState(false);
    const [hasBeenDetected, setHasBeenDetected] = useState(false);
    const [isPeeking, setIsPeeking] = useState(false);

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

    const handleStart = async () => {
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

            const hemiLight = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1.2);
            scene.add(hemiLight);

            const pointLight = new THREE.PointLight(0xffffff, 2.5, 12);
            pointLight.position.set(0, 1.5, 0);
            scene.add(pointLight);

            const festiveColors = [
                new THREE.Color("#ff3333"),
                new THREE.Color("#ffaa00"),
                new THREE.Color("#00ff66"),
                new THREE.Color("#3366ff"),
            ];

            let colorIndex = 0;
            let nextColorIndex = 1;
            let lerpT = 0;

            const anchor = mindarThree.addAnchor(0);

            const modelContainer = new THREE.Group();
            modelContainer.rotation.x = Math.PI / 2;
            anchor.group.add(modelContainer);

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

                    modelContainer.add(model);

                    const subLanterns: THREE.Object3D[] = [];
                    model.traverse((obj: THREE.Object3D) => {
                        const name = obj.name.toLowerCase();
                        if (name.startsWith("sublantern")) {
                            subLanterns.push(obj);
                        }
                    });

                    renderer.setAnimationLoop(() => {
                        model.rotation.y += 0.005;

                        subLanterns.forEach((lantern: THREE.Object3D, index: number) => {
                            lantern.rotation.y += index % 2 === 0 ? 0.02 : -0.02;
                        });

                        lerpT += 0.008;
                        if (lerpT >= 1) {
                            lerpT = 0;
                            colorIndex = nextColorIndex;
                            nextColorIndex = (nextColorIndex + 1) % festiveColors.length;
                        }

                        pointLight.color.lerpColors(
                            festiveColors[colorIndex],
                            festiveColors[nextColorIndex],
                            lerpT
                        );

                        renderer.render(scene, camera);
                    });
                }
            );

            await mindarThree.start();

            // Capture the camera stream for cleanup
            try {
                const video = mindarThree.video;
                if (video && video.srcObject) {
                    streamRef = video.srcObject as MediaStream;
                }
            } catch (_) { }

            // ── Enhanced Autofocus & Resolution ──
            try {
                const video = mindarThree.video;
                if (video && video.srcObject) {
                    const stream = video.srcObject as MediaStream;
                    const track = stream.getVideoTracks()[0];
                    if (track) {
                        const constraints: any = {};

                        // Check if the device supports continuous autofocus
                        const capabilities = (track as any).getCapabilities?.();
                        if (capabilities?.focusMode?.includes("continuous")) {
                            constraints.focusMode = "continuous";
                        } else if (capabilities?.focusMode?.includes("single-shot")) {
                            constraints.focusMode = "single-shot";
                        }

                        // Request higher resolution to reduce blurriness
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
            // Stop the animation loop first
            if (rendererRef) {
                rendererRef.setAnimationLoop(null);
            }

            // Stop MindAR tracking
            if (mindarThree) {
                try { mindarThree.stop(); } catch (_) { }
            }

            // Stop all camera media tracks
            if (streamRef) {
                streamRef.getTracks().forEach(track => track.stop());
            }

            // Dispose Three.js renderer
            if (rendererRef) {
                rendererRef.dispose();
            }

            // Remove any leftover video/canvas elements MindAR injected
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

            // Reset tracking state
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

                    /* ── Back Button ── */
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

                    /* ── Status Pill ── */
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

                    /* ── Scanning Reticle ── */
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

                    /* ── Restore Banner ── */
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

                    /* ── Wish Card ── */
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

                    /* ── Divider line under card top ── */
                    .ar-wish-divider {
                        grid-column: 1 / -1;
                        height: 1px;
                        background: var(--border);
                        margin: 2px 0 0;
                        display: none;
                    }
                `}</style>

                {/* Scanning reticle */}
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

                {/* Status pill */}
                {hasBeenDetected && (
                    <div className="ar-status-pill">
                        <div className={`ar-status-led ${isTargetVisible ? "tracked" : "searching"}`}></div>
                        <span>{isTargetVisible ? "Tracking" : "Searching…"}</span>
                    </div>
                )}

                {/* Restore banner */}
                {hasBeenDetected && !isTargetVisible && (
                    <div className="ar-restore-banner">
                        Point camera at the Vesak QR code to restore the lantern
                    </div>
                )}

                {/* Back button */}
                <button className="ar-back-btn" onClick={handleExit}>
                    <span className="ar-back-arrow">←</span>
                    <span>Exit AR</span>
                </button>

                {/* Wish card */}
                <div className="ar-wish-card">
                    <div className="ar-wish-icon-wrap">🪔</div>
                    <div>
                        <p className="ar-wish-name">
                            Happy Vesak{userName ? `, ${userName}` : ""}
                        </p>
                        <p className="ar-wish-body">{wishText}</p>
                    </div>
                </div>
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

                /* ── Background layers ── */
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

                /* ── Sparks ── */
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

                /* ── Decorative divider ── */
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

                /* ── Card ── */
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

                /* ── Peeking Mode ── */
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

                /* ── Background Peeking Button ── */
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

                /* ── Responsive Scaling for Mobile Devices ── */
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
                    .intro-subtitle {
                        font-size: 11.5px !important;
                        line-height: 1.55 !important;
                        margin-bottom: 18px !important;
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
                    .wish-section {
                        margin-bottom: 16px !important;
                    }
                    .wish-tabs {
                        gap: 6px !important;
                        margin-bottom: 10px !important;
                    }
                    .wish-tab {
                        padding: 8px 4px 8px !important;
                        border-radius: 9px !important;
                    }
                    .wish-tab-emoji {
                        font-size: 16px !important;
                    }
                    .wish-tab-label {
                        font-size: 8px !important;
                    }
                    .wish-textarea {
                        height: 64px !important;
                        padding: 10px 12px !important;
                        font-size: 11px !important;
                        border-radius: 9px !important;
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
                    .intro-subtitle {
                        margin-bottom: 12px !important;
                    }
                    .intro-field {
                        margin-bottom: 12px !important;
                    }
                    .wish-section {
                        margin-bottom: 12px !important;
                    }
                }

                /* ── Badge ── */
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

                /* ── Heading ── */
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
                .intro-subtitle {
                    font-size: 13px;
                    font-weight: 300;
                    line-height: 1.65;
                    color: var(--text-2);
                    font-family: var(--sinhala);
                    margin-bottom: 24px;
                }

                /* ── Section label ── */
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

                /* ── Name input ── */
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

                /* ── Wish selector ── */
                .wish-section {
                    margin-bottom: 22px;
                }
                .wish-tabs {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 8px;
                    margin-bottom: 12px;
                }
                .wish-tab {
                    background: var(--surface-2);
                    border: 1px solid rgba(255,255,255,0.06);
                    border-radius: 11px;
                    padding: 11px 6px 10px;
                    cursor: pointer;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 5px;
                    transition: all 0.2s ease;
                }
                .wish-tab-emoji {
                    font-size: 20px;
                    line-height: 1;
                    transition: transform 0.2s;
                }
                .wish-tab-label {
                    font-family: var(--sinhala);
                    font-size: 9px;
                    font-weight: 500;
                    color: var(--text-2);
                    text-align: center;
                    line-height: 1.4;
                    transition: color 0.2s;
                }
                .wish-tab.active {
                    background: var(--gold-dim);
                    border-color: rgba(201,168,76,0.45);
                }
                .wish-tab.active .wish-tab-label {
                    color: var(--gold-light);
                }
                .wish-tab.active .wish-tab-emoji {
                    transform: scale(1.12);
                }
                .wish-tab:hover:not(.active) {
                    border-color: rgba(255,255,255,0.12);
                    background: rgba(255,255,255,0.03);
                }
                .wish-textarea {
                    width: 100%;
                    height: 76px;
                    background: var(--surface-2);
                    border: 1px solid rgba(255,255,255,0.07);
                    border-radius: 11px;
                    padding: 12px 14px;
                    font-family: var(--sinhala);
                    font-size: 12px;
                    font-weight: 300;
                    color: var(--text-1);
                    line-height: 1.55;
                    resize: none;
                    outline: none;
                    transition: border-color 0.2s, box-shadow 0.2s;
                }
                .wish-textarea::placeholder { color: var(--text-3); }
                .wish-textarea:focus {
                    border-color: rgba(201,168,76,0.4);
                    box-shadow: 0 0 0 3px rgba(201,168,76,0.07);
                }

                /* ── CTA Button ── */
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

                /* ── Footer caption ── */
                .intro-footer {
                    margin-top: 16px;
                    text-align: center;
                    font-size: 11px;
                    font-weight: 300;
                    color: var(--text-3);
                    letter-spacing: 0.3px;
                }
            `}</style>

            {/* Layered background */}
            <div className="intro-bg-image" />
            <div className="intro-bg-gradient" />

            {/* Background Peeking Button */}
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

            {/* Sparks */}
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

            {/* Card */}
            <div className="intro-card">

                {/* Badge */}
                <div style={{ marginBottom: 18 }}>
                    <span className="intro-badge">
                        <span className="intro-badge-dot" />
                        Augmented Reality · Vesak 2026
                    </span>
                </div>

                {/* Heading */}
                <h1 className="intro-title">
                    AR <em>වෙසක්</em> පහන් කූඩුව
                </h1>

                {/* Lotus divider */}
                <div className="lotus-divider">
                    <div className="lotus-line" />
                    <div className="lotus-dot" />
                    <div className="lotus-dot" style={{ opacity: 0.35 }} />
                    <div className="lotus-dot" />
                    <div className="lotus-line" />
                </div>

                <p className="intro-subtitle">
                    පූජනීය බුදු රශ්මි මාලාවෙන් ඔබගේ පරිසරය ඒකාලෝක කරන්න. ආදරය කරන අය වෙනුවෙන් උතුම් වෙසක් ආශිර්වාදයක් එක් කරන්න.
                </p>

                {/* Name field */}
                <div className="intro-field">
                    <label className="field-label">මෙම ආශිර්වාදය කා වෙනුවෙන්ද?</label>
                    <input
                        type="text"
                        className="intro-input"
                        placeholder="නම ඇතුළත් කරන්න…"
                        value={userName}
                        onChange={(e) => setUserName(e.target.value)}
                    />
                </div>

                {/* Wish selector */}
                <div className="wish-section">
                    <label className="field-label">වෙසක් ආශිර්වාදයක් තෝරන්න</label>
                    <div className="wish-tabs">
                        {PRESET_WISHES.map((preset) => {
                            const emoji = preset.label.split(" ")[0];
                            const label = preset.label.split(" ").slice(1).join(" ");
                            return (
                                <button
                                    key={preset.id}
                                    className={`wish-tab ${selectedWishId === preset.id ? "active" : ""}`}
                                    onClick={() => {
                                        setSelectedWishId(preset.id);
                                        setWishText(preset.text);
                                    }}
                                >
                                    <span className="wish-tab-emoji">{emoji}</span>
                                    <span className="wish-tab-label">{label}</span>
                                </button>
                            );
                        })}
                    </div>
                    <textarea
                        className="wish-textarea"
                        value={wishText}
                        onChange={(e) => {
                            setSelectedWishId("custom");
                            setWishText(e.target.value);
                        }}
                        placeholder="ඔබේම ආශිර්වාදයක් ලියන්න…"
                    />
                </div>

                {/* CTA */}
                <button className="intro-cta" onClick={handleStart}>
                    <span className="cta-icon">✦</span>
                    <span>AR පහන් කූඩුව බලන්න</span>
                </button>

                <p className="intro-footer">Point your camera at the Vesak QR code after launching</p>
            </div>
        </div>
    );
}