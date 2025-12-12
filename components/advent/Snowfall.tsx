'use client';

import { useEffect, useRef } from 'react';

interface Snowflake {
    x: number;
    y: number;
    radius: number; // Used for font size
    speed: number;
    wind: number;
    opacity: number;
    character: string;
    swayPhase: number;
}

export function Snowfall() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const SNOWFLAKE_CHARS = ['❄', '❅', '❆', '•'];

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;
        let snowflakes: Snowflake[] = [];

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };

        const createSnowflakes = () => {
            const count = Math.floor(window.innerWidth / 15); // Slightly fewer flakes due to complexity
            snowflakes = [];
            for (let i = 0; i < count; i++) {
                snowflakes.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    radius: Math.random() * 20 + 15,
                    speed: Math.random() * 0.5 + 0.2, // Much slower falling
                    wind: Math.random() * 0.5 - 0.25,
                    opacity: Math.random() * 0.3 + 0.1, // Adjusted opacity
                    character: SNOWFLAKE_CHARS[Math.floor(Math.random() * SNOWFLAKE_CHARS.length)],
                    swayPhase: Math.random() * Math.PI * 2 // Random starting phase for sway
                });
            }
        };

        const updateData = () => {
            for (const flake of snowflakes) {
                flake.y += flake.speed;
                // Add gentle sway using sine wave
                flake.x += Math.sin(flake.y * 0.02 + flake.swayPhase) * 0.5 + flake.wind;

                if (flake.y > canvas.height) {
                    flake.y = -flake.radius;
                    flake.x = Math.random() * canvas.width;
                }
                if (flake.x > canvas.width) {
                    flake.x = 0;
                } else if (flake.x < 0) {
                    flake.x = canvas.width;
                }
            }
        };

        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = 'white';
            ctx.textBaseline = 'middle';
            ctx.textAlign = 'center';

            for (const flake of snowflakes) {
                ctx.font = `${flake.radius}px serif`;
                ctx.fillStyle = `rgba(189, 200, 217, ${flake.opacity})`; // Lighter blue-ish white (Slate-300 range)
                ctx.fillText(flake.character, flake.x, flake.y);
            }
        };

        const loop = () => {
            updateData();
            draw();
            animationFrameId = requestAnimationFrame(loop);
        };

        resize();
        createSnowflakes();
        loop();

        window.addEventListener('resize', () => {
            resize();
            createSnowflakes();
        });

        return () => {
            cancelAnimationFrame(animationFrameId);
            window.removeEventListener('resize', resize);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 pointer-events-none z-0"
            style={{ width: '100%', height: '100%' }}
        />
    );
}
