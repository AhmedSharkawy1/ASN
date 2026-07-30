import 'package:flutter_test/flutter_test.dart';

import 'package:asn_app/core/services/order_poll_client.dart';

/// The background service reports why it lost authentication. Losing that
/// reason is how "token refresh failed" ended up meaning three different
/// things: nobody signed in, the token was rotated away by the app, or the
/// phone was simply offline.
void main() {
  group('refresh outcome', () {
    test('a success carries the token and no error', () {
      const r = RefreshResult(token: 'abc', status: 200);
      expect(r.token, 'abc');
      expect(r.error, isNull);
    });

    test('a failure carries the status and the reason, and no token', () {
      const r = RefreshResult(status: 400, error: 'Invalid Refresh Token: Already Used');
      expect(r.token, isNull);
      expect(r.status, 400);
      expect(r.error, contains('Already Used'));
    });

    test('an unset outcome reads as a failure', () {
      // The default has to be safe: a caller checking `token == null` must not
      // be fooled into thinking a blank result succeeded.
      const r = RefreshResult();
      expect(r.token, isNull);
      expect(r.status, 0);
    });
  });

  group('poll result summary', () {
    test('a failure shows the status and the reason', () {
      final result = PollResult(
        ok: false,
        httpStatus: 400,
        error: 'token refresh failed — Invalid Refresh Token: Already Used',
      );
      expect(result.summary, contains('FAILED'));
      expect(result.summary, contains('400'));
      expect(result.summary, contains('Already Used'));
    });

    test('a success shows how many orders came back', () {
      final result = PollResult(ok: true, httpStatus: 200, rowCount: 3);
      expect(result.summary, contains('OK'));
      expect(result.summary, contains('3'));
    });

    test('survives a round trip through the diagnostics store', () {
      final original = PollResult(ok: false, httpStatus: 401, error: 'token expired');
      final parsed = PollResult.fromJsonString(
        '{"ok":false,"httpStatus":401,"error":"token expired","at":"${original.at.toIso8601String()}"}',
      );
      expect(parsed, isNotNull);
      expect(parsed!.ok, isFalse);
      expect(parsed.httpStatus, 401);
      expect(parsed.error, 'token expired');
    });

    test('unreadable stored status does not crash the screen', () {
      expect(PollResult.fromJsonString('not json'), isNull);
      expect(PollResult.fromJsonString(null), isNull);
      expect(PollResult.fromJsonString(''), isNull);
    });
  });
}
