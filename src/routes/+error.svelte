<script lang="ts">
	import { page } from '$app/stores';
</script>

<div class="min-h-screen flex flex-col bg-[#1a1d23]">
	<!-- Main content -->
	<div class="flex-1 flex flex-col items-center justify-center px-4">
		<!-- Logo -->
		<img
			src="/logo.png"
			alt="CloakBin"
			style="width: 64px; height: 64px; object-fit: contain;"
			class="mb-6 opacity-50"
		/>

		<!-- Message -->
		<h1 class="text-xl md:text-2xl font-semibold text-center mb-3">
			{$page.status === 404 ? 'Paste not found' : 'This paste has expired'}
		</h1>

		<p class="text-zinc-500 text-center mb-8 font-mono text-sm">
			Pastes are permanently deleted for your privacy. They cannot be recovered.
		</p>

		<!-- CTA -->
		<a
			href="/"
			class="w-full max-w-sm px-6 py-3 bg-zinc-700 hover:bg-zinc-600 text-center rounded font-medium transition-colors"
		>
			Create new paste
		</a>
	</div>

	<!-- Footer links -->
	<div class="py-6 flex items-center justify-center gap-6 text-sm text-zinc-600">
		<a href="/privacy" class="hover:text-zinc-400 transition-colors">Privacy Policy</a>
		<a href="/terms" class="hover:text-zinc-400 transition-colors">Terms</a>
		<a href="/contact" class="hover:text-zinc-400 transition-colors">Contact</a>
	</div>
</div>
