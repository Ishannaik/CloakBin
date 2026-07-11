<script lang="ts">
	import { Upload, X, FileUp } from 'lucide-svelte';

	interface Props {
		open: boolean;
		onImport: (content: string, filename: string) => void;
	}
	let { open = $bindable(), onImport }: Props = $props();

	let fileInput = $state<HTMLInputElement | null>(null);

	// Text-ish file types (single-file import; folder/PDF import intentionally omitted in the OSS build)
	const acceptedTypes =
		'.txt,.md,.json,.js,.ts,.jsx,.tsx,.svelte,.vue,.py,.rs,.go,.java,.c,.cpp,.h,.hpp,.cs,.rb,.php,.swift,.kt,.html,.htm,.css,.scss,.sass,.less,.xml,.yaml,.yml,.toml,.ini,.cfg,.conf,.sh,.bash,.zsh,.sql,.graphql,.env,.log,.csv,text/*';

	async function handleFile(file: File) {
		try {
			const text = await file.text();
			onImport(text, file.name);
			open = false;
		} catch (e) {
			console.error('Failed to read file:', e);
			alert('Failed to read file');
		}
	}

	function onInputChange(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (file) handleFile(file);
		input.value = '';
	}

	function close() {
		open = false;
	}
</script>

{#if open}
	<div
		class="fixed inset-0 bg-zinc-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
		role="dialog"
		aria-modal="true"
		aria-label="Import a file"
		tabindex="-1"
		onclick={(e) => {
			if (e.target === e.currentTarget) close();
		}}
		onkeydown={(e) => {
			if (e.key === 'Escape') close();
		}}
	>
		<div class="w-full max-w-md rounded-lg border border-zinc-700 bg-zinc-800 p-5 shadow-xl">
			<div class="mb-4 flex items-center justify-between">
				<h2 class="flex items-center gap-2 text-lg font-semibold text-zinc-100">
					<FileUp size={18} class="text-teal-400" /> Import a file
				</h2>
				<button
					onclick={close}
					class="p-1 text-zinc-400 transition-colors hover:text-zinc-100"
					aria-label="Close"
				>
					<X size={18} />
				</button>
			</div>
			<p class="mb-4 text-sm text-zinc-400">
				Load a text file into the editor. It's encrypted in your browser — nothing is uploaded until
				you create the paste.
			</p>
			<button
				onclick={() => fileInput?.click()}
				class="flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-zinc-600 py-8 text-zinc-300 transition-colors hover:border-teal-500 hover:text-teal-400"
			>
				<Upload size={28} />
				<span class="text-sm font-medium">Choose a file</span>
				<span class="text-xs text-zinc-500">or drag &amp; drop onto the editor</span>
			</button>
			<input
				bind:this={fileInput}
				type="file"
				accept={acceptedTypes}
				class="hidden"
				onchange={onInputChange}
			/>
		</div>
	</div>
{/if}
