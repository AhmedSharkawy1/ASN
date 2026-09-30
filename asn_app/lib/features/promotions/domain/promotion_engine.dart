import 'package:asn_app/features/promotions/data/models/promotion_model.dart';

/// A cart line reduced to what promotion matching needs.
class PromotionCartItem {
  final String itemId;
  final int qty;
  final double? price;

  const PromotionCartItem({required this.itemId, required this.qty, this.price});
}

class AppliedPromotion {
  final PromotionModel promotion;

  /// Money off the subtotal. Zero for free shipping, which waives the
  /// delivery fee instead of discounting the items.
  final double discountAmount;
  final bool freeShipping;

  const AppliedPromotion({
    required this.promotion,
    required this.discountAmount,
    required this.freeShipping,
  });

  /// What the customer actually saves, used to rank competing offers.
  double savingAgainst(double deliveryFee) => freeShipping ? deliveryFee : discountAmount;
}

/// Decides which offer applies to a cart.
///
/// Deliberately mirrors `src/lib/helpers/promotionEngine.ts` — the same order
/// placed from the web menu and from the POS must be discounted identically,
/// so the rules live in one shape in both languages:
///  * dates are compared by day, not by instant (an offer ending today is
///    still valid all day)
///  * a minimum order amount is checked against the subtotal
///  * ONE matching item is enough, not all of them
///  * an offer with no target never applies
///  * when several match, the customer gets the biggest saving
class PromotionEngine {
  const PromotionEngine._();

  /// Offers that are switched on and inside their date window.
  static List<PromotionModel> active(
    List<PromotionModel> promotions, {
    DateTime? now,
  }) {
    final current = now ?? DateTime.now();
    final todayStart = DateTime(current.year, current.month, current.day);

    return promotions.where((p) {
      if (!p.isActive) return false;

      final starts = p.startsAt;
      if (starts != null) {
        final startDay = DateTime(starts.year, starts.month, starts.day);
        if (startDay.isAfter(todayStart)) return false;
      }

      final ends = p.endsAt;
      if (ends != null) {
        // Valid through the end of the closing day.
        final endOfDay = DateTime(ends.year, ends.month, ends.day, 23, 59, 59, 999);
        if (endOfDay.isBefore(current)) return false;
      }

      return true;
    }).toList();
  }

  static bool isApplicable(
    PromotionModel promotion,
    List<PromotionCartItem> cartItems,
    double subtotal, {
    String? enteredCode,
  }) {
    // A coded offer stays locked until the code is entered, and an automatic
    // offer is never unlocked by typing something.
    if (promotion.requiresPromoCode && !promotion.matchesCode(enteredCode)) {
      return false;
    }

    if (promotion.minOrderAmount > 0 && subtotal < promotion.minOrderAmount) {
      return false;
    }

    // No target at all — the offer is incomplete, so it never fires.
    if (promotion.requiredItems.isEmpty) return false;

    if (promotion.isBogo) {
      final setSize = promotion.bogoBuyQty + promotion.bogoGetQty;
      final targetIds = promotion.items.map((i) => i.itemId).toSet();
      final eligibleQty = cartItems.fold<int>(
        0,
        (sum, c) => (promotion.appliesToAllItems || targetIds.contains(c.itemId)) ? sum + c.qty : sum,
      );
      return eligibleQty >= setSize;
    }

    if (promotion.appliesToAllItems) {
      return cartItems.any((c) => c.qty > 0);
    }

    final targetIds = promotion.items.map((i) => i.itemId).toSet();
    return cartItems.any((c) => c.qty > 0 && targetIds.contains(c.itemId));
  }

  static ({double discountAmount, bool freeShipping}) discountFor(
    PromotionModel promotion,
    double subtotal,
    double deliveryFee, {
    List<PromotionCartItem> cartItems = const [],
  }) {
    if (promotion.isBogo) {
      final buyQty = promotion.bogoBuyQty;
      final getQty = promotion.bogoGetQty;
      final setSize = buyQty + getQty;
      final targetIds = promotion.items.map((i) => i.itemId).toSet();
      final prices = <double>[];
      final totalQty = cartItems.fold<int>(0, (s, c) => s + c.qty);
      final avgPrice = totalQty > 0 ? subtotal / totalQty : 0.0;

      for (final c in cartItems) {
        if (promotion.appliesToAllItems || targetIds.contains(c.itemId)) {
          final p = c.price ?? avgPrice;
          for (var i = 0; i < c.qty; i++) {
            prices.add(p);
          }
        }
      }

      if (prices.length < setSize) return (discountAmount: 0, freeShipping: false);

      final sets = prices.length ~/ setSize;
      final freeCount = sets * getQty;
      prices.sort();
      final discount = prices.take(freeCount).fold<double>(0, (s, p) => s + p);

      return (
        discountAmount: (discount * 100).roundToDouble() / 100,
        freeShipping: false,
      );
    }

    switch (promotion.discountType) {
      case PromotionModel.typeFixed:
        // Never discount more than the order is worth.
        return (
          discountAmount: promotion.discountValue.clamp(0, subtotal).toDouble(),
          freeShipping: false,
        );

      case PromotionModel.typePercentage:
        final raw = subtotal * promotion.discountValue / 100;
        return (
          discountAmount: (raw * 100).roundToDouble() / 100,
          freeShipping: false,
        );

      case PromotionModel.typeFreeShipping:
        return (discountAmount: 0, freeShipping: true);

      default:
        return (discountAmount: 0, freeShipping: false);
    }
  }

  /// The single best offer for this cart, or null when none match.
  static AppliedPromotion? evaluate({
    required List<PromotionCartItem> cartItems,
    required List<PromotionModel> promotions,
    required double subtotal,
    double deliveryFee = 0,
    String? enteredCode,
    DateTime? now,
  }) {
    AppliedPromotion? best;

    for (final promo in active(promotions, now: now)) {
      if (!isApplicable(promo, cartItems, subtotal, enteredCode: enteredCode)) continue;

      final result = discountFor(promo, subtotal, deliveryFee, cartItems: cartItems);
      final candidate = AppliedPromotion(
        promotion: promo,
        discountAmount: result.discountAmount,
        freeShipping: result.freeShipping,
      );

      if (candidate.savingAgainst(deliveryFee) <= 0) continue;
      if (best == null ||
          candidate.savingAgainst(deliveryFee) > best.savingAgainst(deliveryFee)) {
        best = candidate;
      }
    }

    return best;
  }
}
