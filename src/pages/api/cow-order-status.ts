import { NextApiRequest, NextApiResponse } from 'next'
import { cowProtocolService } from '../../services/cowProtocol'
import { Hex } from 'viem'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { orderUid } = req.query

    if (!orderUid || typeof orderUid !== 'string') {
      return res.status(400).json({ 
        success: false,
        error: 'Order UID is required' 
      })
    }

    console.log('Checking CoW Protocol order status:', orderUid)

    const orderStatus = await cowProtocolService.getOrderStatus(orderUid as Hex)

    const response = {
      success: true,
      orderUid,
      status: orderStatus.status,
      creationDate: orderStatus.creationDate,
      executedSellAmount: orderStatus.executedSellAmount,
      executedBuyAmount: orderStatus.executedBuyAmount,
      executedFeeAmount: orderStatus.executedFeeAmount,
      transactionHash: orderStatus.txHash,
      basescanUrl: orderStatus.txHash ? `https://basescan.org/tx/${orderStatus.txHash}` : null,
      isExecuted: orderStatus.status === 'fulfilled',
      isPending: ['presignaturePending', 'open'].includes(orderStatus.status),
      isFailed: ['cancelled', 'expired'].includes(orderStatus.status)
    }

    console.log('CoW Protocol order status response:', response)

    return res.status(200).json(response)

  } catch (error) {
    console.error('CoW Protocol order status error:', error)
    
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to check order status'
    })
  }
}
