import 'package:flutter/material.dart';
import 'package:asn_app/shared/presentation/widgets/app_navigation_drawer.dart';

class KitchenScreen extends StatelessWidget {
  const KitchenScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Kitchen Screen'),
      ),
      drawer: const AppNavigationDrawer(),
      body: const Center(
        child: Text('Kitchen Operations Screen'),
      ),
    );
  }
}
