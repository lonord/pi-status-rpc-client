export default function createRPCClient(baseUrl: string) {
	if (!baseUrl.endsWith('/')) {
		baseUrl = baseUrl + '/'
	}
	return {
		httpGet: (path: string, params?: { [x: string]: string | number }) => {
			const query = getQuery(params)
			return httpGet(`${baseUrl}/${path}${query}`)
		},
		openSSE: (path: string, onData: (data: any) => void, onClose: () => void,
			params: { [x: string]: string | number }) => {
			const query = getQuery(params)
			const fullUrl = `${baseUrl}/${path}${query}`
			const sse = new EventSource(fullUrl)
			sse.addEventListener('data', (event: any) => onData && onData(event.data))
			sse.addEventListener('error', onClose)
			return {
				isClosed: () => sse.readyState === sse.CLOSED,
				close: () => sse.close()
			}
		}
	}
}

async function httpGet(fullUrl: string) {
	let data = null
	let error = null
	try {
		const res = await fetch(fullUrl)
		if (res.ok) {
			data = await res.json()
		}
	} catch (e) {
		error = e.message || e
	}
	return {
		error,
		data
	}
}

function getQuery(params?: { [x: string]: string | number }) {
	if (params) {
		let query = ''
		for (const k in params) {
			if (params.hasOwnProperty(k)) {
				if (query !== '') {
					query += '&'
				}
				query += `${k}=${params[k]}`
			}
		}
		return '?' + query
	} else {
		return ''
	}
}
