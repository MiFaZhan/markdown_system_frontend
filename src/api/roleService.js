import * as request from './request'

export async function getRoleList() {
  return request.get('/role/list')
}

export async function getRoleById(roleId) {
  return request.get('/role', { roleId })
}
