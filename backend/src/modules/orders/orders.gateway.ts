import { WebSocketGateway, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage, MessageBody, ConnectedSocket } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({ namespace: '/orders', cors: { origin: '*' } })
export class OrdersGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(OrdersGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('joinStore')
  handleJoinStore(@MessageBody() storeId: string, @ConnectedSocket() client: Socket) {
    client.join(`store:${storeId}`);
    client.emit('joinedStore', { storeId, message: `Joined store room: ${storeId}` });
  }

  emitNewOrder(storeId: string, order: any) {
    this.server.to(`store:${storeId}`).emit('newOrder', order);
  }

  emitOrderStatusUpdate(storeId: string, orderId: string, status: string) {
    this.server.to(`store:${storeId}`).emit('orderStatusUpdated', { id: orderId, status });
  }

  emitLowStockAlert(storeId: string, productId: string, productName: string, quantity: number) {
    this.server.to(`store:${storeId}`).emit('lowStockAlert', { productId, productName, quantity });
  }
}
