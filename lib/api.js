const API_BASE_URL = '/api'

class APIClient {
  constructor() {
    this.token = null
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('accessToken')
    }
  }

  setToken(token) {
    this.token = token
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('accessToken', token)
      } else {
        localStorage.removeItem('accessToken')
      }
    }
  }

  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    }

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`
    }

    const response = await fetch(url, {
      ...options,
      headers
    })

    if (response.status === 401) {
      // Token expired, try to refresh
      const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('refreshToken') : null
      if (refreshToken) {
        const refreshResponse = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken })
        })

        if (refreshResponse.ok) {
          const data = await refreshResponse.json()
          this.setToken(data.accessToken)
          if (typeof window !== 'undefined') {
            localStorage.setItem('refreshToken', data.refreshToken)
          }
          // Retry original request
          headers['Authorization'] = `Bearer ${data.accessToken}`
          return fetch(url, { ...options, headers })
        }
      }

      // Refresh failed, redirect to login
      if (typeof window !== 'undefined') {
        localStorage.clear()
        window.location.href = '/'
      }
      throw new Error('Unauthorized')
    }

    return response
  }

  async get(endpoint) {
    const response = await this.request(endpoint, { method: 'GET' })
    return response.json()
  }

  async post(endpoint, data) {
    const response = await this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data)
    })
    return response.json()
  }

  async put(endpoint, data) {
    const response = await this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data)
    })
    return response.json()
  }

  async delete(endpoint) {
    const response = await this.request(endpoint, { method: 'DELETE' })
    return response.json()
  }

  // Auth
  async login(email, password, twoFactorToken) {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, twoFactorToken })
    })
    return response.json()
  }

  async logout() {
    this.setToken(null)
    if (typeof window !== 'undefined') {
      localStorage.removeItem('refreshToken')
      localStorage.removeItem('user')
    }
  }

  async verifyToken() {
    return this.get('/auth/verify')
  }

  // Orders
  async getOrders(params) {
    const query = new URLSearchParams(params).toString()
    return this.get(`/orders${query ? `?${query}` : ''}`)
  }

  async getOrder(id) {
    return this.get(`/orders/${id}`)
  }

  async createOrder(data) {
    return this.post('/orders', data)
  }

  async updateOrder(id, data) {
    return this.put(`/orders/${id}`, data)
  }

  // Production
  async getKanbanData() {
    return this.get('/production/kanban')
  }

  async updateProductionStage(id, data) {
    return this.put(`/production/stages/${id}`, data)
  }

  // Customers
  async getCustomers() {
    return this.get('/customers')
  }

  async createCustomer(data) {
    return this.post('/customers', data)
  }

  // Products
  async getProducts() {
    return this.get('/products')
  }

  // Components
  async getComponents() {
    return this.get('/components')
  }

  async createComponent(data) {
    return this.post('/components', data)
  }

  // Suppliers
  async getSuppliers() {
    return this.get('/suppliers')
  }

  async createSupplier(data) {
    return this.post('/suppliers', data)
  }

  // QC
  async getQCInspections(orderId) {
    return this.get(`/qc/inspections${orderId ? `?orderId=${orderId}` : ''}`)
  }

  async createQCInspection(data) {
    return this.post('/qc/inspections', data)
  }

  // Dashboard
  async getDashboardStats() {
    return this.get('/dashboard/stats')
  }

  // Users
  async getUsers() {
    return this.get('/users')
  }

  // Payments
  async getPayments(orderId) {
    return this.get(`/payments${orderId ? `?orderId=${orderId}` : ''}`)
  }

  async createPayment(data) {
    return this.post('/payments', data)
  }

  // Critical Alerts
  async getAlerts(params) {
    const query = new URLSearchParams(params).toString()
    return this.get(`/alerts${query ? `?${query}` : ''}`)
  }

  async createAlert(data) {
    return this.post('/alerts', data)
  }

  async updateAlert(id, data) {
    return this.put(`/alerts/${id}`, data)
  }

  // Documents
  async getDocuments(params) {
    const query = new URLSearchParams(params).toString()
    return this.get(`/documents${query ? `?${query}` : ''}`)
  }

  async uploadDocument(data) {
    return this.post('/documents/upload', data)
  }

  // Order deletion (CEO only)
  async deleteOrder(id) {
    return this.delete(`/orders/${id}`)
  }
}

export default new APIClient()
