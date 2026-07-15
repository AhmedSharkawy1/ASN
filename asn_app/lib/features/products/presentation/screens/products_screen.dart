import 'package:flutter/material.dart';
import 'package:asn_app/shared/presentation/widgets/app_navigation_drawer.dart';

class ProductsScreen extends StatelessWidget {
  const ProductsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Products Screen'),
      ),
      drawer: const AppNavigationDrawer(),
      body: const Center(
        child: Text('Products & Menu Inventory Screen'),
      ),
    );
  }
}
