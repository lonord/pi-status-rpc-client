import { isNumber } from 'util'

export interface SSEClient {
	isClosed(): boolean
	close()
}

export interface RPCClient {
	httpGet(path: string, params?: { [x: string]: string | number }): Promise<any>
	httpPost(path: string, data: any, params?: { [x: string]: string | number }): Promise<any>
	openSSE(path: string,
		onData: (data: any) => void, params: { [x: string]: string | number },
		retryTimeout?: number): SSEClient
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
		httpPost: (path: string, data: any, params?: { [x: string]: string | number }) => {
			const query = getQuery(params)
			return httpPost(`${baseUrl}http/${path}${query}`, data)
		},
		openSSE: (path: string,
			onData: (data: any) => void, params: { [x: string]: string | number },
			retryTimeout?: number) => {
			const query = getQuery(params)
			const fullUrl = `${baseUrl}sse/${path}${query}`
			const onDataRecv = (event: any) => {
				dog && dog.feed()
				onData && onData(JSON.parse(event.data))
			}
			let sse = new EventSource(fullUrl)
			sse.addEventListener('data', onDataRecv)
			let dog = null
			if (isNumber(retryTimeout)) {
				dog = createWatchDog(retryTimeout, () => {
					sse && sse.close()
					sse = new EventSource(fullUrl)
					sse.addEventListener('data', onDataRecv)
				})
			}
			return {
				isClosed: () => sse.readyState === sse.CLOSED,
				close: () => {
					dog && dog.stop()
					sse.close()
				}
			}
		}
	}
}

async function httpGet(fullUrl: string) {
	const res = await fetch(fullUrl)
	if (res.ok) {
		return await res.json()
	}
	throw new Error(`fetch failed ${res.status} ${res.statusText}`)
}

async function httpPost(fullUrl: string, data: any) {
	const res = await fetch(fullUrl, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(data)
	})
	if (res.ok) {
		return await res.json()
	}
	throw new Error(`fetch failed ${res.status} ${res.statusText}`)
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

function createWatchDog(timeout: number, bark: () => void) {
	let timer = setTimeout(bark, timeout)
	return {
		feed: () => {
			timer && clearTimeout(timer)
			timer = setTimeout(bark, timeout)
		},
		stop: () => {
			timer && clearTimeout(timer)
			timer = null
		}
	}
}
