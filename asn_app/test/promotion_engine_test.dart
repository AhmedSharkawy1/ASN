import 'package:flutter_test/flutter_test.dart';

import 'package:asn_app/features/promotions/data/models/promotion_model.dart';
import 'package:asn_app/features/promotions/domain/promotion_engine.dart';

PromotionModel _promo({
  String id = 'p1',
  String name = 'عرض',
  String type = PromotionModel.typePercentage,
  double value = 10,
  double minOrder = 0,
  bool active = true,
  bool allItems = false,
  List<String> itemIds = const [],
  DateTime? startsAt,
  DateTime? endsAt,
}) {
  return PromotionModel.fromJson({
    'id': id,
    'name_ar': name,
    'discount_type': type,
    'discount_value': value,
    'min_order_amount': minOrder,
    'is_active': active,
    'required_items': [
      if (allItems)
        {'item_id': PromotionModel.allItemsId, 'item_title_ar': 'كل الأصناف', 'qty': 1},
      for (final id in itemIds) {'item_id': id, 'item_title_ar': id, 'qty': 1},
    ],
    if (startsAt != null) 'starts_at': startsAt.toIso8601String(),
    if (endsAt != null) 'ends_at': endsAt.toIso8601String(),
  });
}

List<PromotionCartItem> _cart(Map<String, int> items) =>
    [for (final e in items.entries) PromotionCartItem(itemId: e.key, qty: e.value)];

void main() {
  group('matching', () {
    test('an all-items offer applies to any non-empty cart', () {
      final result = PromotionEngine.evaluate(
        cartItems: _cart({'anything': 1}),
        promotions: [_promo(allItems: true, value: 10)],
        subtotal: 200,
      );
      expect(result, isNotNull);
      expect(result!.discountAmount, 20);
    });

    test('an all-items offer does not apply to an empty cart', () {
      final result = PromotionEngine.evaluate(
        cartItems: const [],
        promotions: [_promo(allItems: true)],
        subtotal: 0,
      );
      expect(result, isNull);
    });

    test('one matching item is enough — not all of them', () {
      final result = PromotionEngine.evaluate(
        cartItems: _cart({'burger': 1}),
        promotions: [_promo(itemIds: ['burger', 'pizza'])],
        subtotal: 100,
      );
      expect(result, isNotNull);
    });

    test('an offer for other items does not apply', () {
      final result = PromotionEngine.evaluate(
        cartItems: _cart({'juice': 2}),
        promotions: [_promo(itemIds: ['burger'])],
        subtotal: 100,
      );
      expect(result, isNull);
    });

    test('an offer with no target never applies', () {
      final result = PromotionEngine.evaluate(
        cartItems: _cart({'burger': 1}),
        promotions: [_promo()],
        subtotal: 500,
      );
      expect(result, isNull, reason: 'this is what made app-created offers dead');
    });

    test('a subtotal below the minimum blocks the offer', () {
      final promos = [_promo(allItems: true, minOrder: 200)];
      expect(
        PromotionEngine.evaluate(
            cartItems: _cart({'a': 1}), promotions: promos, subtotal: 199),
        isNull,
      );
      expect(
        PromotionEngine.evaluate(
            cartItems: _cart({'a': 1}), promotions: promos, subtotal: 200),
        isNotNull,
      );
    });

    test('an item with zero quantity does not trigger the offer', () {
      final result = PromotionEngine.evaluate(
        cartItems: _cart({'burger': 0}),
        promotions: [_promo(itemIds: ['burger'])],
        subtotal: 100,
      );
      expect(result, isNull);
    });
  });

  group('amounts', () {
    test('percentage is taken off the subtotal and rounded to piastres', () {
      final result = PromotionEngine.evaluate(
        cartItems: _cart({'a': 1}),
        promotions: [_promo(allItems: true, type: PromotionModel.typePercentage, value: 15)],
        subtotal: 133.33,
      );
      expect(result!.discountAmount, 20.0);
    });

    test('a fixed discount never exceeds the order value', () {
      final result = PromotionEngine.evaluate(
        cartItems: _cart({'a': 1}),
        promotions: [_promo(allItems: true, type: PromotionModel.typeFixed, value: 500)],
        subtotal: 120,
      );
      expect(result!.discountAmount, 120);
    });

    test('free shipping waives the fee rather than discounting items', () {
      final result = PromotionEngine.evaluate(
        cartItems: _cart({'a': 1}),
        promotions: [_promo(allItems: true, type: PromotionModel.typeFreeShipping)],
        subtotal: 100,
        deliveryFee: 30,
      );
      expect(result!.freeShipping, isTrue);
      expect(result.discountAmount, 0);
      expect(result.savingAgainst(30), 30);
    });

    test('free shipping is not offered when there is no fee to waive', () {
      final result = PromotionEngine.evaluate(
        cartItems: _cart({'a': 1}),
        promotions: [_promo(allItems: true, type: PromotionModel.typeFreeShipping)],
        subtotal: 100,
        deliveryFee: 0,
      );
      expect(result, isNull, reason: 'a zero saving is not worth showing');
    });
  });

  group('choosing between offers', () {
    test('the customer gets the biggest saving', () {
      final result = PromotionEngine.evaluate(
        cartItems: _cart({'a': 1}),
        promotions: [
          _promo(id: 'small', name: 'صغير', allItems: true, type: PromotionModel.typeFixed, value: 10),
          _promo(id: 'big', name: 'كبير', allItems: true, type: PromotionModel.typePercentage, value: 25),
        ],
        subtotal: 200,
      );
      expect(result!.promotion.id, 'big');
      expect(result.discountAmount, 50);
    });

    test('free shipping wins only when the fee beats the alternative', () {
      final promos = [
        _promo(id: 'ship', allItems: true, type: PromotionModel.typeFreeShipping),
        _promo(id: 'cash', allItems: true, type: PromotionModel.typeFixed, value: 20),
      ];

      expect(
        PromotionEngine.evaluate(
                cartItems: _cart({'a': 1}), promotions: promos, subtotal: 100, deliveryFee: 50)!
            .promotion
            .id,
        'ship',
      );
      expect(
        PromotionEngine.evaluate(
                cartItems: _cart({'a': 1}), promotions: promos, subtotal: 100, deliveryFee: 5)!
            .promotion
            .id,
        'cash',
      );
    });
  });

  group('dates and activation', () {
    final now = DateTime(2026, 7, 29, 14, 0);

    test('an inactive offer is skipped', () {
      final result = PromotionEngine.evaluate(
        cartItems: _cart({'a': 1}),
        promotions: [_promo(allItems: true, active: false)],
        subtotal: 100,
        now: now,
      );
      expect(result, isNull);
    });

    test('an offer ending today is still valid all day', () {
      final result = PromotionEngine.evaluate(
        cartItems: _cart({'a': 1}),
        promotions: [_promo(allItems: true, endsAt: DateTime(2026, 7, 29))],
        subtotal: 100,
        now: now,
      );
      expect(result, isNotNull);
    });

    test('an offer starting today is already valid', () {
      final result = PromotionEngine.evaluate(
        cartItems: _cart({'a': 1}),
        promotions: [_promo(allItems: true, startsAt: DateTime(2026, 7, 29, 23, 0))],
        subtotal: 100,
        now: now,
      );
      expect(result, isNotNull);
    });

    test('an offer that ended yesterday is skipped', () {
      final result = PromotionEngine.evaluate(
        cartItems: _cart({'a': 1}),
        promotions: [_promo(allItems: true, endsAt: DateTime(2026, 7, 28))],
        subtotal: 100,
        now: now,
      );
      expect(result, isNull);
    });

    test('an offer starting tomorrow is skipped', () {
      final result = PromotionEngine.evaluate(
        cartItems: _cart({'a': 1}),
        promotions: [_promo(allItems: true, startsAt: DateTime(2026, 7, 30))],
        subtotal: 100,
        now: now,
      );
      expect(result, isNull);
    });
  });
}
