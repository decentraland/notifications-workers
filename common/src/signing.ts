import crypto from 'crypto'

export function signUrl(key: string, url: string) {
  const parsedUrl = new URL(url)

  if (parsedUrl.searchParams.has('signature')) {
    throw new Error('"signature" is a reserved parameter when generating signed urls')
  }

  const signature = crypto.createHmac('sha256', key).update(parsedUrl.toString()).digest('hex')
  parsedUrl.searchParams.append('signature', signature)
  return parsedUrl.toString()
}

export function hasValidSignature(key: string, url: string): boolean {
  const parsedUrl = new URL(url)

  if (!parsedUrl.searchParams.has('signature')) {
    return false
  }

  const receivedSignature = parsedUrl.searchParams.get('signature')
  parsedUrl.searchParams.delete('signature')

  const signature = crypto.createHmac('sha256', key).update(parsedUrl.toString()).digest('hex')
  return signature === receivedSignature
}
