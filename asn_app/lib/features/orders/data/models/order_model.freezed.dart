// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'order_model.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$OrderItemModel {

 String get id;@JsonKey(name: 'product_id') String get productId;@JsonKey(name: 'products') Map<String, dynamic>? get productInfo; int get quantity; double get price; List<Map<String, dynamic>>? get addons;
/// Create a copy of OrderItemModel
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$OrderItemModelCopyWith<OrderItemModel> get copyWith => _$OrderItemModelCopyWithImpl<OrderItemModel>(this as OrderItemModel, _$identity);

  /// Serializes this OrderItemModel to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is OrderItemModel&&(identical(other.id, id) || other.id == id)&&(identical(other.productId, productId) || other.productId == productId)&&const DeepCollectionEquality().equals(other.productInfo, productInfo)&&(identical(other.quantity, quantity) || other.quantity == quantity)&&(identical(other.price, price) || other.price == price)&&const DeepCollectionEquality().equals(other.addons, addons));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,productId,const DeepCollectionEquality().hash(productInfo),quantity,price,const DeepCollectionEquality().hash(addons));

@override
String toString() {
  return 'OrderItemModel(id: $id, productId: $productId, productInfo: $productInfo, quantity: $quantity, price: $price, addons: $addons)';
}


}

/// @nodoc
abstract mixin class $OrderItemModelCopyWith<$Res>  {
  factory $OrderItemModelCopyWith(OrderItemModel value, $Res Function(OrderItemModel) _then) = _$OrderItemModelCopyWithImpl;
@useResult
$Res call({
 String id,@JsonKey(name: 'product_id') String productId,@JsonKey(name: 'products') Map<String, dynamic>? productInfo, int quantity, double price, List<Map<String, dynamic>>? addons
});




}
/// @nodoc
class _$OrderItemModelCopyWithImpl<$Res>
    implements $OrderItemModelCopyWith<$Res> {
  _$OrderItemModelCopyWithImpl(this._self, this._then);

  final OrderItemModel _self;
  final $Res Function(OrderItemModel) _then;

/// Create a copy of OrderItemModel
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? productId = null,Object? productInfo = freezed,Object? quantity = null,Object? price = null,Object? addons = freezed,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,productId: null == productId ? _self.productId : productId // ignore: cast_nullable_to_non_nullable
as String,productInfo: freezed == productInfo ? _self.productInfo : productInfo // ignore: cast_nullable_to_non_nullable
as Map<String, dynamic>?,quantity: null == quantity ? _self.quantity : quantity // ignore: cast_nullable_to_non_nullable
as int,price: null == price ? _self.price : price // ignore: cast_nullable_to_non_nullable
as double,addons: freezed == addons ? _self.addons : addons // ignore: cast_nullable_to_non_nullable
as List<Map<String, dynamic>>?,
  ));
}

}


/// Adds pattern-matching-related methods to [OrderItemModel].
extension OrderItemModelPatterns on OrderItemModel {
/// A variant of `map` that fallback to returning `orElse`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _OrderItemModel value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _OrderItemModel() when $default != null:
return $default(_that);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// Callbacks receives the raw object, upcasted.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case final Subclass2 value:
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _OrderItemModel value)  $default,){
final _that = this;
switch (_that) {
case _OrderItemModel():
return $default(_that);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `map` that fallback to returning `null`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _OrderItemModel value)?  $default,){
final _that = this;
switch (_that) {
case _OrderItemModel() when $default != null:
return $default(_that);case _:
  return null;

}
}
/// A variant of `when` that fallback to an `orElse` callback.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id, @JsonKey(name: 'product_id')  String productId, @JsonKey(name: 'products')  Map<String, dynamic>? productInfo,  int quantity,  double price,  List<Map<String, dynamic>>? addons)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _OrderItemModel() when $default != null:
return $default(_that.id,_that.productId,_that.productInfo,_that.quantity,_that.price,_that.addons);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// As opposed to `map`, this offers destructuring.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case Subclass2(:final field2):
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id, @JsonKey(name: 'product_id')  String productId, @JsonKey(name: 'products')  Map<String, dynamic>? productInfo,  int quantity,  double price,  List<Map<String, dynamic>>? addons)  $default,) {final _that = this;
switch (_that) {
case _OrderItemModel():
return $default(_that.id,_that.productId,_that.productInfo,_that.quantity,_that.price,_that.addons);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `when` that fallback to returning `null`
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id, @JsonKey(name: 'product_id')  String productId, @JsonKey(name: 'products')  Map<String, dynamic>? productInfo,  int quantity,  double price,  List<Map<String, dynamic>>? addons)?  $default,) {final _that = this;
switch (_that) {
case _OrderItemModel() when $default != null:
return $default(_that.id,_that.productId,_that.productInfo,_that.quantity,_that.price,_that.addons);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _OrderItemModel extends OrderItemModel {
  const _OrderItemModel({required this.id, @JsonKey(name: 'product_id') required this.productId, @JsonKey(name: 'products') required final  Map<String, dynamic>? productInfo, required this.quantity, required this.price, required final  List<Map<String, dynamic>>? addons}): _productInfo = productInfo,_addons = addons,super._();
  factory _OrderItemModel.fromJson(Map<String, dynamic> json) => _$OrderItemModelFromJson(json);

@override final  String id;
@override@JsonKey(name: 'product_id') final  String productId;
 final  Map<String, dynamic>? _productInfo;
@override@JsonKey(name: 'products') Map<String, dynamic>? get productInfo {
  final value = _productInfo;
  if (value == null) return null;
  if (_productInfo is EqualUnmodifiableMapView) return _productInfo;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableMapView(value);
}

@override final  int quantity;
@override final  double price;
 final  List<Map<String, dynamic>>? _addons;
@override List<Map<String, dynamic>>? get addons {
  final value = _addons;
  if (value == null) return null;
  if (_addons is EqualUnmodifiableListView) return _addons;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(value);
}


/// Create a copy of OrderItemModel
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$OrderItemModelCopyWith<_OrderItemModel> get copyWith => __$OrderItemModelCopyWithImpl<_OrderItemModel>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$OrderItemModelToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _OrderItemModel&&(identical(other.id, id) || other.id == id)&&(identical(other.productId, productId) || other.productId == productId)&&const DeepCollectionEquality().equals(other._productInfo, _productInfo)&&(identical(other.quantity, quantity) || other.quantity == quantity)&&(identical(other.price, price) || other.price == price)&&const DeepCollectionEquality().equals(other._addons, _addons));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,productId,const DeepCollectionEquality().hash(_productInfo),quantity,price,const DeepCollectionEquality().hash(_addons));

@override
String toString() {
  return 'OrderItemModel(id: $id, productId: $productId, productInfo: $productInfo, quantity: $quantity, price: $price, addons: $addons)';
}


}

/// @nodoc
abstract mixin class _$OrderItemModelCopyWith<$Res> implements $OrderItemModelCopyWith<$Res> {
  factory _$OrderItemModelCopyWith(_OrderItemModel value, $Res Function(_OrderItemModel) _then) = __$OrderItemModelCopyWithImpl;
@override @useResult
$Res call({
 String id,@JsonKey(name: 'product_id') String productId,@JsonKey(name: 'products') Map<String, dynamic>? productInfo, int quantity, double price, List<Map<String, dynamic>>? addons
});




}
/// @nodoc
class __$OrderItemModelCopyWithImpl<$Res>
    implements _$OrderItemModelCopyWith<$Res> {
  __$OrderItemModelCopyWithImpl(this._self, this._then);

  final _OrderItemModel _self;
  final $Res Function(_OrderItemModel) _then;

/// Create a copy of OrderItemModel
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? productId = null,Object? productInfo = freezed,Object? quantity = null,Object? price = null,Object? addons = freezed,}) {
  return _then(_OrderItemModel(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,productId: null == productId ? _self.productId : productId // ignore: cast_nullable_to_non_nullable
as String,productInfo: freezed == productInfo ? _self._productInfo : productInfo // ignore: cast_nullable_to_non_nullable
as Map<String, dynamic>?,quantity: null == quantity ? _self.quantity : quantity // ignore: cast_nullable_to_non_nullable
as int,price: null == price ? _self.price : price // ignore: cast_nullable_to_non_nullable
as double,addons: freezed == addons ? _self._addons : addons // ignore: cast_nullable_to_non_nullable
as List<Map<String, dynamic>>?,
  ));
}


}


/// @nodoc
mixin _$OrderModel {

 String get id;@JsonKey(name: 'restaurant_id') String get restaurantId;@JsonKey(name: 'branch_id') String? get branchId;@JsonKey(name: 'order_number') String get orderNumber; String get status;@JsonKey(name: 'total_price') double get totalPrice;@JsonKey(name: 'created_at') String get createdAt;@JsonKey(name: 'payment_method') String get paymentMethod;@JsonKey(name: 'customer_name') String? get customerName;@JsonKey(name: 'customer_phone') String? get customerPhone;@JsonKey(name: 'customer_address') String? get customerAddress; String? get notes;@JsonKey(name: 'order_items') List<OrderItemModel>? get items;
/// Create a copy of OrderModel
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$OrderModelCopyWith<OrderModel> get copyWith => _$OrderModelCopyWithImpl<OrderModel>(this as OrderModel, _$identity);

  /// Serializes this OrderModel to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is OrderModel&&(identical(other.id, id) || other.id == id)&&(identical(other.restaurantId, restaurantId) || other.restaurantId == restaurantId)&&(identical(other.branchId, branchId) || other.branchId == branchId)&&(identical(other.orderNumber, orderNumber) || other.orderNumber == orderNumber)&&(identical(other.status, status) || other.status == status)&&(identical(other.totalPrice, totalPrice) || other.totalPrice == totalPrice)&&(identical(other.createdAt, createdAt) || other.createdAt == createdAt)&&(identical(other.paymentMethod, paymentMethod) || other.paymentMethod == paymentMethod)&&(identical(other.customerName, customerName) || other.customerName == customerName)&&(identical(other.customerPhone, customerPhone) || other.customerPhone == customerPhone)&&(identical(other.customerAddress, customerAddress) || other.customerAddress == customerAddress)&&(identical(other.notes, notes) || other.notes == notes)&&const DeepCollectionEquality().equals(other.items, items));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,restaurantId,branchId,orderNumber,status,totalPrice,createdAt,paymentMethod,customerName,customerPhone,customerAddress,notes,const DeepCollectionEquality().hash(items));

@override
String toString() {
  return 'OrderModel(id: $id, restaurantId: $restaurantId, branchId: $branchId, orderNumber: $orderNumber, status: $status, totalPrice: $totalPrice, createdAt: $createdAt, paymentMethod: $paymentMethod, customerName: $customerName, customerPhone: $customerPhone, customerAddress: $customerAddress, notes: $notes, items: $items)';
}


}

/// @nodoc
abstract mixin class $OrderModelCopyWith<$Res>  {
  factory $OrderModelCopyWith(OrderModel value, $Res Function(OrderModel) _then) = _$OrderModelCopyWithImpl;
@useResult
$Res call({
 String id,@JsonKey(name: 'restaurant_id') String restaurantId,@JsonKey(name: 'branch_id') String? branchId,@JsonKey(name: 'order_number') String orderNumber, String status,@JsonKey(name: 'total_price') double totalPrice,@JsonKey(name: 'created_at') String createdAt,@JsonKey(name: 'payment_method') String paymentMethod,@JsonKey(name: 'customer_name') String? customerName,@JsonKey(name: 'customer_phone') String? customerPhone,@JsonKey(name: 'customer_address') String? customerAddress, String? notes,@JsonKey(name: 'order_items') List<OrderItemModel>? items
});




}
/// @nodoc
class _$OrderModelCopyWithImpl<$Res>
    implements $OrderModelCopyWith<$Res> {
  _$OrderModelCopyWithImpl(this._self, this._then);

  final OrderModel _self;
  final $Res Function(OrderModel) _then;

/// Create a copy of OrderModel
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? restaurantId = null,Object? branchId = freezed,Object? orderNumber = null,Object? status = null,Object? totalPrice = null,Object? createdAt = null,Object? paymentMethod = null,Object? customerName = freezed,Object? customerPhone = freezed,Object? customerAddress = freezed,Object? notes = freezed,Object? items = freezed,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,restaurantId: null == restaurantId ? _self.restaurantId : restaurantId // ignore: cast_nullable_to_non_nullable
as String,branchId: freezed == branchId ? _self.branchId : branchId // ignore: cast_nullable_to_non_nullable
as String?,orderNumber: null == orderNumber ? _self.orderNumber : orderNumber // ignore: cast_nullable_to_non_nullable
as String,status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as String,totalPrice: null == totalPrice ? _self.totalPrice : totalPrice // ignore: cast_nullable_to_non_nullable
as double,createdAt: null == createdAt ? _self.createdAt : createdAt // ignore: cast_nullable_to_non_nullable
as String,paymentMethod: null == paymentMethod ? _self.paymentMethod : paymentMethod // ignore: cast_nullable_to_non_nullable
as String,customerName: freezed == customerName ? _self.customerName : customerName // ignore: cast_nullable_to_non_nullable
as String?,customerPhone: freezed == customerPhone ? _self.customerPhone : customerPhone // ignore: cast_nullable_to_non_nullable
as String?,customerAddress: freezed == customerAddress ? _self.customerAddress : customerAddress // ignore: cast_nullable_to_non_nullable
as String?,notes: freezed == notes ? _self.notes : notes // ignore: cast_nullable_to_non_nullable
as String?,items: freezed == items ? _self.items : items // ignore: cast_nullable_to_non_nullable
as List<OrderItemModel>?,
  ));
}

}


/// Adds pattern-matching-related methods to [OrderModel].
extension OrderModelPatterns on OrderModel {
/// A variant of `map` that fallback to returning `orElse`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _OrderModel value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _OrderModel() when $default != null:
return $default(_that);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// Callbacks receives the raw object, upcasted.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case final Subclass2 value:
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _OrderModel value)  $default,){
final _that = this;
switch (_that) {
case _OrderModel():
return $default(_that);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `map` that fallback to returning `null`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _OrderModel value)?  $default,){
final _that = this;
switch (_that) {
case _OrderModel() when $default != null:
return $default(_that);case _:
  return null;

}
}
/// A variant of `when` that fallback to an `orElse` callback.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id, @JsonKey(name: 'restaurant_id')  String restaurantId, @JsonKey(name: 'branch_id')  String? branchId, @JsonKey(name: 'order_number')  String orderNumber,  String status, @JsonKey(name: 'total_price')  double totalPrice, @JsonKey(name: 'created_at')  String createdAt, @JsonKey(name: 'payment_method')  String paymentMethod, @JsonKey(name: 'customer_name')  String? customerName, @JsonKey(name: 'customer_phone')  String? customerPhone, @JsonKey(name: 'customer_address')  String? customerAddress,  String? notes, @JsonKey(name: 'order_items')  List<OrderItemModel>? items)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _OrderModel() when $default != null:
return $default(_that.id,_that.restaurantId,_that.branchId,_that.orderNumber,_that.status,_that.totalPrice,_that.createdAt,_that.paymentMethod,_that.customerName,_that.customerPhone,_that.customerAddress,_that.notes,_that.items);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// As opposed to `map`, this offers destructuring.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case Subclass2(:final field2):
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id, @JsonKey(name: 'restaurant_id')  String restaurantId, @JsonKey(name: 'branch_id')  String? branchId, @JsonKey(name: 'order_number')  String orderNumber,  String status, @JsonKey(name: 'total_price')  double totalPrice, @JsonKey(name: 'created_at')  String createdAt, @JsonKey(name: 'payment_method')  String paymentMethod, @JsonKey(name: 'customer_name')  String? customerName, @JsonKey(name: 'customer_phone')  String? customerPhone, @JsonKey(name: 'customer_address')  String? customerAddress,  String? notes, @JsonKey(name: 'order_items')  List<OrderItemModel>? items)  $default,) {final _that = this;
switch (_that) {
case _OrderModel():
return $default(_that.id,_that.restaurantId,_that.branchId,_that.orderNumber,_that.status,_that.totalPrice,_that.createdAt,_that.paymentMethod,_that.customerName,_that.customerPhone,_that.customerAddress,_that.notes,_that.items);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `when` that fallback to returning `null`
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id, @JsonKey(name: 'restaurant_id')  String restaurantId, @JsonKey(name: 'branch_id')  String? branchId, @JsonKey(name: 'order_number')  String orderNumber,  String status, @JsonKey(name: 'total_price')  double totalPrice, @JsonKey(name: 'created_at')  String createdAt, @JsonKey(name: 'payment_method')  String paymentMethod, @JsonKey(name: 'customer_name')  String? customerName, @JsonKey(name: 'customer_phone')  String? customerPhone, @JsonKey(name: 'customer_address')  String? customerAddress,  String? notes, @JsonKey(name: 'order_items')  List<OrderItemModel>? items)?  $default,) {final _that = this;
switch (_that) {
case _OrderModel() when $default != null:
return $default(_that.id,_that.restaurantId,_that.branchId,_that.orderNumber,_that.status,_that.totalPrice,_that.createdAt,_that.paymentMethod,_that.customerName,_that.customerPhone,_that.customerAddress,_that.notes,_that.items);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _OrderModel extends OrderModel {
  const _OrderModel({required this.id, @JsonKey(name: 'restaurant_id') required this.restaurantId, @JsonKey(name: 'branch_id') required this.branchId, @JsonKey(name: 'order_number') required this.orderNumber, required this.status, @JsonKey(name: 'total_price') required this.totalPrice, @JsonKey(name: 'created_at') required this.createdAt, @JsonKey(name: 'payment_method') required this.paymentMethod, @JsonKey(name: 'customer_name') required this.customerName, @JsonKey(name: 'customer_phone') required this.customerPhone, @JsonKey(name: 'customer_address') required this.customerAddress, required this.notes, @JsonKey(name: 'order_items') required final  List<OrderItemModel>? items}): _items = items,super._();
  factory _OrderModel.fromJson(Map<String, dynamic> json) => _$OrderModelFromJson(json);

@override final  String id;
@override@JsonKey(name: 'restaurant_id') final  String restaurantId;
@override@JsonKey(name: 'branch_id') final  String? branchId;
@override@JsonKey(name: 'order_number') final  String orderNumber;
@override final  String status;
@override@JsonKey(name: 'total_price') final  double totalPrice;
@override@JsonKey(name: 'created_at') final  String createdAt;
@override@JsonKey(name: 'payment_method') final  String paymentMethod;
@override@JsonKey(name: 'customer_name') final  String? customerName;
@override@JsonKey(name: 'customer_phone') final  String? customerPhone;
@override@JsonKey(name: 'customer_address') final  String? customerAddress;
@override final  String? notes;
 final  List<OrderItemModel>? _items;
@override@JsonKey(name: 'order_items') List<OrderItemModel>? get items {
  final value = _items;
  if (value == null) return null;
  if (_items is EqualUnmodifiableListView) return _items;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(value);
}


/// Create a copy of OrderModel
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$OrderModelCopyWith<_OrderModel> get copyWith => __$OrderModelCopyWithImpl<_OrderModel>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$OrderModelToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _OrderModel&&(identical(other.id, id) || other.id == id)&&(identical(other.restaurantId, restaurantId) || other.restaurantId == restaurantId)&&(identical(other.branchId, branchId) || other.branchId == branchId)&&(identical(other.orderNumber, orderNumber) || other.orderNumber == orderNumber)&&(identical(other.status, status) || other.status == status)&&(identical(other.totalPrice, totalPrice) || other.totalPrice == totalPrice)&&(identical(other.createdAt, createdAt) || other.createdAt == createdAt)&&(identical(other.paymentMethod, paymentMethod) || other.paymentMethod == paymentMethod)&&(identical(other.customerName, customerName) || other.customerName == customerName)&&(identical(other.customerPhone, customerPhone) || other.customerPhone == customerPhone)&&(identical(other.customerAddress, customerAddress) || other.customerAddress == customerAddress)&&(identical(other.notes, notes) || other.notes == notes)&&const DeepCollectionEquality().equals(other._items, _items));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,restaurantId,branchId,orderNumber,status,totalPrice,createdAt,paymentMethod,customerName,customerPhone,customerAddress,notes,const DeepCollectionEquality().hash(_items));

@override
String toString() {
  return 'OrderModel(id: $id, restaurantId: $restaurantId, branchId: $branchId, orderNumber: $orderNumber, status: $status, totalPrice: $totalPrice, createdAt: $createdAt, paymentMethod: $paymentMethod, customerName: $customerName, customerPhone: $customerPhone, customerAddress: $customerAddress, notes: $notes, items: $items)';
}


}

/// @nodoc
abstract mixin class _$OrderModelCopyWith<$Res> implements $OrderModelCopyWith<$Res> {
  factory _$OrderModelCopyWith(_OrderModel value, $Res Function(_OrderModel) _then) = __$OrderModelCopyWithImpl;
@override @useResult
$Res call({
 String id,@JsonKey(name: 'restaurant_id') String restaurantId,@JsonKey(name: 'branch_id') String? branchId,@JsonKey(name: 'order_number') String orderNumber, String status,@JsonKey(name: 'total_price') double totalPrice,@JsonKey(name: 'created_at') String createdAt,@JsonKey(name: 'payment_method') String paymentMethod,@JsonKey(name: 'customer_name') String? customerName,@JsonKey(name: 'customer_phone') String? customerPhone,@JsonKey(name: 'customer_address') String? customerAddress, String? notes,@JsonKey(name: 'order_items') List<OrderItemModel>? items
});




}
/// @nodoc
class __$OrderModelCopyWithImpl<$Res>
    implements _$OrderModelCopyWith<$Res> {
  __$OrderModelCopyWithImpl(this._self, this._then);

  final _OrderModel _self;
  final $Res Function(_OrderModel) _then;

/// Create a copy of OrderModel
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? restaurantId = null,Object? branchId = freezed,Object? orderNumber = null,Object? status = null,Object? totalPrice = null,Object? createdAt = null,Object? paymentMethod = null,Object? customerName = freezed,Object? customerPhone = freezed,Object? customerAddress = freezed,Object? notes = freezed,Object? items = freezed,}) {
  return _then(_OrderModel(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,restaurantId: null == restaurantId ? _self.restaurantId : restaurantId // ignore: cast_nullable_to_non_nullable
as String,branchId: freezed == branchId ? _self.branchId : branchId // ignore: cast_nullable_to_non_nullable
as String?,orderNumber: null == orderNumber ? _self.orderNumber : orderNumber // ignore: cast_nullable_to_non_nullable
as String,status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as String,totalPrice: null == totalPrice ? _self.totalPrice : totalPrice // ignore: cast_nullable_to_non_nullable
as double,createdAt: null == createdAt ? _self.createdAt : createdAt // ignore: cast_nullable_to_non_nullable
as String,paymentMethod: null == paymentMethod ? _self.paymentMethod : paymentMethod // ignore: cast_nullable_to_non_nullable
as String,customerName: freezed == customerName ? _self.customerName : customerName // ignore: cast_nullable_to_non_nullable
as String?,customerPhone: freezed == customerPhone ? _self.customerPhone : customerPhone // ignore: cast_nullable_to_non_nullable
as String?,customerAddress: freezed == customerAddress ? _self.customerAddress : customerAddress // ignore: cast_nullable_to_non_nullable
as String?,notes: freezed == notes ? _self.notes : notes // ignore: cast_nullable_to_non_nullable
as String?,items: freezed == items ? _self._items : items // ignore: cast_nullable_to_non_nullable
as List<OrderItemModel>?,
  ));
}


}

// dart format on
