export let Cookies = {
	get(name) {
		const value = `; ${document.cookie}`;
		const parts = value.split(`; ${name}=`);
		if (parts.length === 2)
			return parts.pop().split(';').shift();

		return null;
	},
	set(name, value) {
		document.cookie = `${name}=${value}`;
	},
	delete(name) {
		document.cookie = `${name}=; max-age=0`;
	}
}
