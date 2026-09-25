import 'dart:io';

import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:asn_app/core/config/app_config.dart';
import 'package:asn_app/core/logging/logger.dart';

/// Result of an image upload containing both original and thumbnail URLs.
class ImageUploadResult {
  final String originalUrl;
  final String thumbUrl;

  const ImageUploadResult({required this.originalUrl, required this.thumbUrl});
}

/// Uploads menu images through the platform's existing Next.js
/// /api/upload-image route (same path the web dashboard uses), which
/// stores them in Cloudflare R2 (or Supabase `menu-images` bucket as fallback).
class ImageUploadService {
  final Dio _dio;

  ImageUploadService()
      : _dio = Dio(BaseOptions(
          baseUrl: AppConfig.apiBaseUrl,
          connectTimeout: const Duration(seconds: 20),
          receiveTimeout: const Duration(seconds: 60),
          sendTimeout: const Duration(seconds: 60),
        ));

  /// Uploads an image and returns both originalUrl and thumbUrl.
  /// If [restaurantId] is provided, the server will also revalidate
  /// the public menu cache for that restaurant.
  /// If [itemId] or [categoryId] is provided, the server will also directly
  /// update the database record with the new image and thumbnail URLs.
  Future<ImageUploadResult> uploadImageWithThumb(
    File file, {
    String? restaurantId,
    String? itemId,
    String? categoryId,
  }) async {
    try {
      final map = <String, dynamic>{
        'file': await MultipartFile.fromFile(file.path, filename: 'image.webp'),
      };
      if (restaurantId != null && restaurantId.isNotEmpty) {
        map['restaurantId'] = restaurantId;
      }
      if (itemId != null && itemId.isNotEmpty) {
        map['itemId'] = itemId;
      }
      if (categoryId != null && categoryId.isNotEmpty) {
        map['categoryId'] = categoryId;
      }
      final formData = FormData.fromMap(map);

      final response = await _dio.post<Map<String, dynamic>>(
        '/api/upload-image',
        data: formData,
      );

      final origUrl = response.data?['originalUrl'] as String?;
      final tUrl = response.data?['thumbUrl'] as String?;
      if (origUrl == null || origUrl.isEmpty) {
        throw Exception(response.data?['error']?.toString() ?? 'Upload returned no URL');
      }
      return ImageUploadResult(
        originalUrl: origUrl,
        thumbUrl: tUrl ?? origUrl,
      );
    } on DioException catch (e) {
      AppLogger.error('Image upload failed', error: e, name: 'ImageUpload');
      final serverMsg = e.response?.data is Map ? (e.response?.data['error']?.toString()) : null;
      throw Exception(serverMsg ?? 'Image upload failed: ${e.message}');
    }
  }

  /// Legacy method — returns only the originalUrl for backward compatibility.
  Future<String> uploadImage(
    File file, {
    String? restaurantId,
    String? itemId,
    String? categoryId,
  }) async {
    final result = await uploadImageWithThumb(
      file,
      restaurantId: restaurantId,
      itemId: itemId,
      categoryId: categoryId,
    );
    return result.originalUrl;
  }
}

final imageUploadServiceProvider = Provider<ImageUploadService>((ref) {
  return ImageUploadService();
});
