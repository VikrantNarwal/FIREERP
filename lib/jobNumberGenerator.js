import prisma from './prisma'

export async function generateJobNumber() {
  const year = new Date().getFullYear().toString().slice(-2)
  const month = (new Date().getMonth() + 1).toString().padStart(2, '0')
  
  // Get count of orders this month
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  const count = await prisma.order.count({
    where: {
      orderDate: {
        gte: startOfMonth
      }
    }
  })
  
  const sequence = (count + 1).toString().padStart(4, '0')
  return `JOB${year}${month}${sequence}`
}
