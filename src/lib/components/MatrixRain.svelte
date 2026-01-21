<script lang="ts">
	import { onMount } from 'svelte';

	let canvas: HTMLCanvasElement;
	let animationId: number;

	onMount(() => {
		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		const context = ctx;

		const resize = () => {
			canvas.width = window.innerWidth;
			canvas.height = window.innerHeight;
		};
		resize();

		const chars = 'CLOAKBIN01アイウエオカキクケコサシスセソ';
		const fontSize = 14;
		let columns = Math.floor(canvas.width / fontSize);
		let drops: number[] = new Array(columns).fill(1);

		const reinitDrops = () => {
			columns = Math.floor(canvas.width / fontSize);
			drops = new Array(columns).fill(1);
		};

		const resizeHandler = () => {
			resize();
			reinitDrops();
		};
		window.addEventListener('resize', resizeHandler);

		let lastTime = 0;
		const frameInterval = 50; // ~20fps for slower rain

		function draw(currentTime: number) {
			animationId = requestAnimationFrame(draw);

			if (currentTime - lastTime < frameInterval) return;
			lastTime = currentTime;

			context.fillStyle = 'rgba(0, 0, 0, 0.05)';
			context.fillRect(0, 0, canvas.width, canvas.height);

			context.fillStyle = '#14b8a6';
			context.font = `${fontSize}px monospace`;

			for (let i = 0; i < drops.length; i++) {
				const char = chars[Math.floor(Math.random() * chars.length)];
				context.fillText(char, i * fontSize, drops[i] * fontSize);

				if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
					drops[i] = 0;
				}
				drops[i]++;
			}
		}

		animationId = requestAnimationFrame(draw);

		return () => {
			cancelAnimationFrame(animationId);
			window.removeEventListener('resize', resizeHandler);
		};
	});
</script>

<canvas
	bind:this={canvas}
	class="fixed inset-0 z-[9999] pointer-events-none"
	aria-hidden="true"
></canvas>
