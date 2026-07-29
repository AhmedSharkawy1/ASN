import 'package:flutter_test/flutter_test.dart';

import 'package:asn_app/features/promotions/data/models/promotion_model.dart';

PromotionModel _promo(List<Map<String, dynamic>> requiredItems) =>
    PromotionModel.fromJson({
      'id': 'p1',
      'name_ar': 'عرض',
      'discount_type': 'percentage',
      'discount_value': 10,
      'min_order_amount': 0,
      'required_items': requiredItems,
    });

void main() {
  group('promotion target', () {
    test('the all-items marker is recognised and never listed as a product', () {
      final promo = _promo([
        {'item_id': PromotionModel.allItemsId, 'item_title_ar': 'كل الأصناف', 'qty': 1},
      ]);

      expect(promo.appliesToAllItems, isTrue);
      expect(promo.items, isEmpty, reason: 'the marker is not a real menu item');
      expect(promo.hasNoTarget, isFalse);
    });

    test('specific items are parsed with their titles', () {
      final promo = _promo([
        {'item_id': 'i1', 'item_title_ar': 'برجر', 'item_title_en': 'Burger', 'qty': 2},
      ]);

      expect(promo.appliesToAllItems, isFalse);
      expect(promo.items.single.itemId, 'i1');
      expect(promo.items.single.titleAr, 'برجر');
      expect(promo.items.single.qty, 2);
      expect(promo.hasNoTarget, isFalse);
    });

    test('an empty target is flagged — the checkout engine skips such a promo', () {
      expect(_promo(const []).hasNoTarget, isTrue);
    });

    test('the marker can sit alongside items without hiding them', () {
      final promo = _promo([
        {'item_id': PromotionModel.allItemsId, 'item_title_ar': 'كل الأصناف', 'qty': 1},
        {'item_id': 'i1', 'item_title_ar': 'برجر', 'qty': 1},
      ]);

      expect(promo.appliesToAllItems, isTrue);
      expect(promo.items.map((i) => i.itemId), ['i1']);
    });

    test('the marker matches the value the web engine looks for', () {
      // Both dashboards read the same rows; a rename on one side would
      // silently stop offers created on the other from applying.
      expect(PromotionModel.allItemsId, '__all_items__');
    });
  });

  group('promotion item json', () {
    test('round-trips through the shape stored in required_items', () {
      const item = PromotionItem(itemId: 'i9', titleAr: 'بيتزا', titleEn: 'Pizza', qty: 3);
      final parsed = PromotionItem.fromJson(item.toJson());

      expect(parsed.itemId, 'i9');
      expect(parsed.titleAr, 'بيتزا');
      expect(parsed.titleEn, 'Pizza');
      expect(parsed.qty, 3);
    });

    test('defaults qty to 1 when the row omits it', () {
      final parsed = PromotionItem.fromJson({'item_id': 'i1', 'item_title_ar': 'شاي'});
      expect(parsed.qty, 1);
    });
  });

  group('expiry', () {
    test('an end date in the past marks the promotion expired', () {
      final promo = PromotionModel.fromJson({
        'id': 'p2',
        'name_ar': 'قديم',
        'discount_type': 'fixed_amount',
        'discount_value': 5,
        'min_order_amount': 0,
        'required_items': const <Map<String, dynamic>>[],
        'ends_at': DateTime.now().subtract(const Duration(days: 1)).toIso8601String(),
      });
      expect(promo.isExpired, isTrue);
    });

    test('no end date never expires', () {
      expect(_promo(const []).isExpired, isFalse);
    });
  });
}
