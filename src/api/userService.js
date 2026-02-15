import { post, get, put, del } from './request'

export function login(data) {
  return post('/user/login', data)
}

export function getUserInfo() {
  return get('/user/info')
}

export function register(data) {
  return post('/user/register', data)
}

export function listUsers(params) {
  return get('/user/list', params)
}

export function updateUser(data) {
  return put('/user', data)
}

export function deleteUser(userId) {
  return del(`/user/${userId}`)
}
