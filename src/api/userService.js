import { post, get } from './request'

export function login(data) {
  return post('/user/login', data)
}

export function getUserInfo() {
  return get('/user/info')
}
