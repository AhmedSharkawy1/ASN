import 'package:flutter_test/flutter_test.dart';
import 'package:asn_app/core/config/app_config.dart';
import 'package:asn_app/features/qr/presentation/providers/qr_provider.dart';

// Verifies the mobile QR encodes the exact same URL the web /dashboard/qr
// page produces, so QR codes are interchangeable between web and mobile.
void main() {
  const restaurantId = 'abc-123';

  test('slug present → subdomain URL (whole menu)', () {
    const info = QrInfo(restaurantId: restaurantId, slug: 'abosalah');
    expect(info.menuUrl(), 'https://abosalah.asntechnology.net');
  });

  test('slug present → subdomain URL with table query', () {
    const info = QrInfo(restaurantId: restaurantId, slug: 'abosalah');
    // No label known: the id still identifies the table in the alert.
    expect(info.menuUrl(tableId: 't1'),
        'https://abosalah.asntechnology.net?table=t1&table_id=t1');
    // With a label, that is what a waiter reads — the id rides along.
    // Spaces encode as "+", which URLSearchParams on the menu decodes back.
    expect(info.menuUrl(tableId: 't1', tableLabel: 'ترابيزة 5'),
        'https://abosalah.asntechnology.net?table=%D8%AA%D8%B1%D8%A7%D8%A8%D9%8A%D8%B2%D8%A9+5&table_id=t1');
  });

  test('no slug → id-based path on the main domain', () {
    const info = QrInfo(restaurantId: restaurantId, slug: null);
    expect(info.menuUrl(), '${AppConfig.apiBaseUrl}/menu/$restaurantId');
  });

  test('no slug → id-based path with table query', () {
    const info = QrInfo(restaurantId: restaurantId, slug: '');
    expect(info.menuUrl(tableId: 't9'),
        '${AppConfig.apiBaseUrl}/menu/$restaurantId?table=t9&table_id=t9');
  });
}
