export interface SSEClient {
	isClosed(): boolean
	close()
}

export interface RPCClient {
	httpGet(path: string, params?: { [x: string]: string | number }): Promise<any>
	openSSE(path: string, onData: (data: any) => void, params: { [x: string]: string | number }): SSEClient
}

export default function createRPCClient(baseUrl: string): RPCClient {
	if (!baseUrl.endsWith('/')) {
		baseUrl = baseUrl + '/'
	}
	return {
		httpGet: (path: string, params?: { [x: string]: string | number }) => {
			const query = getQuery(params)
			return httpGet(`${baseUrl}http/${path}${query}`)
		},
		openSSE: (path: string, onData: (data: any) => void, params: { [x: string]: string | number }) => {
			const query = getQuery(params)
			const fullUrl = `${baseUrl}sse/${path}${query}`
			const sse = new EventSource(fullUrl)
			sse.addEventListener('data', (event: any) => onData && onData(event.data))
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
