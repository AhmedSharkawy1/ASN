import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:asn_app/core/notifications/notifications_service.dart';
import 'package:asn_app/core/logging/logger.dart';
import 'package:asn_app/features/auth/presentation/providers/auth_provider.dart';
import 'package:asn_app/features/orders/domain/entities/order_entity.dart';
import 'package:asn_app/features/orders/domain/repositories/orders_repository.dart';
import 'package:asn_app/features/orders/domain/usecases/get_orders_usecase.dart';
import 'package:asn_app/features/orders/domain/usecases/update_order_status_usecase.dart';
import 'package:asn_app/features/orders/domain/usecases/subscribe_new_orders_usecase.dart';
import 'package:asn_app/features/orders/data/datasources/orders_remote_datasource.dart';
import 'package:asn_app/features/orders/data/repositories/orders_repository_impl.dart';

// DI Providers
final ordersRemoteDataSourceProvider = Provider<OrdersRemoteDataSource>((ref) {
  return OrdersRemoteDataSourceImpl();
});

final ordersRepositoryProvider = Provider<OrdersRepository>((ref) {
  final remote = ref.watch(ordersRemoteDataSourceProvider);
  return OrdersRepositoryImpl(remote);
});

final getOrdersUseCaseProvider = Provider<GetOrdersUseCase>((ref) {
  final repo = ref.watch(ordersRepositoryProvider);
  return GetOrdersUseCase(repo);
});

final updateOrderStatusUseCaseProvider = Provider<UpdateOrderStatusUseCase>((ref) {
  final repo = ref.watch(ordersRepositoryProvider);
  return UpdateOrderStatusUseCase(repo);
});

final subscribeNewOrdersUseCaseProvider = Provider<SubscribeNewOrdersUseCase>((ref) {
  final repo = ref.watch(ordersRepositoryProvider);
  return SubscribeNewOrdersUseCase(repo);
});

final notificationsServiceProvider = Provider<NotificationsService>((ref) {
  final service = NotificationsService();
  service.initialize();
  return service;
});

// State provider for active branch ID filtering using modern Notifier
class ActiveBranchNotifier extends Notifier<String?> {
  @override
  String? build() {
    final authState = ref.watch(authNotifierProvider);
    return authState.maybeWhen(
      authenticated: (user) => user.role.name == 'staff' ? user.restaurantId : 'all',
      orElse: () => null,
    );
  }

  void updateBranch(String? branchId) {
    state = branchId;
  }
}

final activeBranchProvider = NotifierProvider<ActiveBranchNotifier, String?>(() {
  return ActiveBranchNotifier();
});

// Orders State Notifier (AsyncValue list of orders)
class OrdersNotifier extends Notifier<AsyncValue<List<OrderEntity>>> {
  StreamSubscription<OrderEntity>? _subscription;

  @override
  AsyncValue<List<OrderEntity>> build() {
    ref.onDispose(() {
      _subscription?.cancel();
    });

    final branchId = ref.watch(activeBranchProvider);
    unawaited(_loadAndSubscribe(branchId));
    
    return const AsyncValue.loading();
  }

  Future<void> _loadAndSubscribe(String? branchId) async {
    final authState = ref.read(authNotifierProvider);
    final restaurantId = authState.maybeWhen(
      authenticated: (user) => user.restaurantId,
      orElse: () => null,
    );

    if (restaurantId == null) {
      state = const AsyncValue.data([]);
      return;
    }

    try {
      AppLogger.info('Loading initial orders for restaurant: $restaurantId', name: 'OrdersNotifier');
      final orders = await ref.read(getOrdersUseCaseProvider).call(
            restaurantId,
            branchId: branchId,
          );

      state = AsyncValue.data(orders);

      await _subscription?.cancel();
      _subscription = ref.read(subscribeNewOrdersUseCaseProvider)
          .call(restaurantId, branchId: branchId)
          .listen((OrderEntity newOrder) {
            _onNewOrderReceived(newOrder);
          });
    } catch (e, stack) {
      AppLogger.error('Failed to load orders or subscribe to realtime changes', error: e, stackTrace: stack, name: 'OrdersNotifier');
      state = AsyncValue.error(e, stack);
    }
  }

  void _onNewOrderReceived(OrderEntity newOrder) {
    AppLogger.info('Realtime new order received in state notifier: ${newOrder.id}', name: 'OrdersNotifier');

    unawaited(ref.read(notificationsServiceProvider).showNewOrderNotification(newOrder));

    final currentOrders = state.value ?? [];
    if (currentOrders.any((o) => o.id == newOrder.id)) return;

    state = AsyncValue.data([newOrder, ...currentOrders]);
  }

  Future<void> updateStatus(String orderId, String newStatus) async {
    final currentOrders = state.value ?? [];
    try {
      state = AsyncValue.data(
        currentOrders.map((o) => o.id == orderId ? o.copyWith(status: newStatus) : o).toList(),
      );

      await ref.read(updateOrderStatusUseCaseProvider).call(orderId, newStatus);
      AppLogger.info('Order status updated successfully: $orderId -> $newStatus', name: 'OrdersNotifier');
    } catch (e) {
      state = AsyncValue.data(currentOrders);
      AppLogger.error('Failed to update order status', error: e, name: 'OrdersNotifier');
      rethrow;
    }
  }

  Future<void> refresh() async {
    state = const AsyncValue.loading();
    final branchId = ref.read(activeBranchProvider);
    await _loadAndSubscribe(branchId);
  }
}

final ordersNotifierProvider = NotifierProvider<OrdersNotifier, AsyncValue<List<OrderEntity>>>(() {
  return OrdersNotifier();
});
