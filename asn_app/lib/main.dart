import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:asn_app/bootstrap.dart';
import 'package:asn_app/app.dart';

void main() async {
  final container = await bootstrap();

  runApp(
    UncontrolledProviderScope(
      container: container,
      child: const AsnApp(),
    ),
  );
}
