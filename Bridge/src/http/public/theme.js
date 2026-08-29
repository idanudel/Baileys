;(() => {
	const STORAGE_KEY = 'bridge-theme'

	const apply = theme => {
		document.documentElement.setAttribute('data-theme', theme)
	}

	const preferred = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
	apply(localStorage.getItem(STORAGE_KEY) || preferred)

	window.toggleBridgeTheme = () => {
		const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'
		localStorage.setItem(STORAGE_KEY, next)
		apply(next)
	}
})()
