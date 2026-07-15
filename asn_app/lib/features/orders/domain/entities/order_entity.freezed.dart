// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'order_entity.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;
/// @nodoc
mixin _$OrderItemEntity {

 String get id; String get productId; String get productName; int get quantity; double get price; List<Map<String, dynamic>> get addons;
/// Create a copy of OrderItemEntity
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$OrderItemEntityCopyWith<OrderItemEntity> get copyWith => _$OrderItemEntityCopyWithImpl<OrderItemEntity>(this as OrderItemEntity, _$identity);



@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is OrderItemEntity&&(identical(other.id, id) || other.id == id)&&(identical(other.productId, productId) || other.productId == productId)&&(identical(other.productName, productName) || other.productName == productName)&&(identical(other.quantity, quantity) || other.quantity == quantity)&&(identical(other.price, price) || other.price == price)&&const DeepCollectionEquality().equals(other.addons, addons));
}


@override
int get hashCode => Object.hash(runtimeType,id,productId,productName,quantity,price,const DeepCollectionEquality().hash(addons));

@override
String toString() {
  return 'OrderItemEntity(id: $id, productId: $productId, productName: $productName, quantity: $quantity, price: $price, addons: $addons)';
}


}

/// @nodoc
abstract mixin class $OrderItemEntityCopyWith<$Res>  {
  factory $OrderItemEntityCopyWith(OrderItemEntity value, $Res Function(OrderItemEntity) _then) = _$OrderItemEntityCopyWithImpl;
@useResult
$Res call({
 String id, String productId, String productName, int quantity, double price, List<Map<String, dynamic>> addons
});




}
/// @nodoc
class _$OrderItemEntityCopyWithImpl<$Res>
    implements $OrderItemEntityCopyWith<$Res> {
  _$OrderItemEntityCopyWithImpl(this._self, this._then);

  final OrderItemEntity _self;
  final $Res Function(OrderItemEntity) _then;

/// Create a copy of OrderItemEntity
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? productId = null,Object? productName = null,Object? quantity = null,Object? price = null,Object? addons = null,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,productId: null == productId ? _self.productId : productId // ignore: cast_nullable_to_non_nullable
as String,productName: null == productName ? _self.productName : productName // ignore: cast_nullable_to_non_nullable
as String,quantity: null == quantity ? _self.quantity : quantity // ignore: cast_nullable_to_non_nullable
as int,price: null == price ? _self.price : price // ignore: cast_nullable_to_non_nullable
as double,addons: null == addons ? _self.addons : addons // ignore: cast_nullable_to_non_nullable
as List<Map<String, dynamic>>,
  ));
}

}


/// Adds pattern-matching-related methods to [OrderItemEntity].
extension OrderItemEntityPatterns on OrderItemEntity {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _OrderItemEntity value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _OrderItemEntity() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _OrderItemEntity value)  $default,){
final _that = this;
switch (_that) {
case _OrderItemEntity():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _OrderItemEntity value)?  $default,){
final _that = this;
switch (_that) {
case _OrderItemEntity() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String productId,  String productName,  int quantity,  double price,  List<Map<String, dynamic>> addons)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _OrderItemEntity() when $default != null:
return $default(_that.id,_that.productId,_that.productName,_that.quantity,_that.price,_that.addons);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String productId,  String productName,  int quantity,  double price,  List<Map<String, dynamic>> addons)  $default,) {final _that = this;
switch (_that) {
case _OrderItemEntity():
return $default(_that.id,_that.productId,_that.productName,_that.quantity,_that.price,_that.addons);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String productId,  String productName,  int quantity,  double price,  List<Map<String, dynamic>> addons)?  $default,) {final _that = this;
switch (_that) {
case _OrderItemEntity() when $default != null:
return $default(_that.id,_that.productId,_that.productName,_that.quantity,_that.price,_that.addons);case _:
  return null;

}
}

}

/// @nodoc


class _OrderItemEntity implements OrderItemEntity {
  const _OrderItemEntity({required this.id, required this.productId, required this.productName, required this.quantity, required this.price, required final  List<Map<String, dynamic>> addons}): _addons = addons;
  

@override final  String id;
@override final  String productId;
@override final  String productName;
@override final  int quantity;
@override final  double price;
 final  List<Map<String, dynamic>> _addons;
@override List<Map<String, dynamic>> get addons {
  if (_addons is EqualUnmodifiableListView) return _addons;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_addons);
}


/// Create a copy of OrderItemEntity
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$OrderItemEntityCopyWith<_OrderItemEntity> get copyWith => __$OrderItemEntityCopyWithImpl<_OrderItemEntity>(this, _$identity);



@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _OrderItemEntity&&(identical(other.id, id) || other.id == id)&&(identical(other.productId, productId) || other.productId == productId)&&(identical(other.productName, productName) || other.productName == productName)&&(identical(other.quantity, quantity) || other.quantity == quantity)&&(identical(other.price, price) || other.price == price)&&const DeepCollectionEquality().equals(other._addons, _addons));
}


@override
int get hashCode => Object.hash(runtimeType,id,productId,productName,quantity,price,const DeepCollectionEquality().hash(_addons));

@override
String toString() {
  return 'OrderItemEntity(id: $id, productId: $productId, productName: $productName, quantity: $quantity, price: $price, addons: $addons)';
}


}

/// @nodoc
abstract mixin class _$OrderItemEntityCopyWith<$Res> implements $OrderItemEntityCopyWith<$Res> {
  factory _$OrderItemEntityCopyWith(_OrderItemEntity value, $Res Function(_OrderItemEntity) _then) = __$OrderItemEntityCopyWithImpl;
@override @useResult
$Res call({
 String id, String productId, String productName, int quantity, double price, List<Map<String, dynamic>> addons
});




}
/// @nodoc
class __$OrderItemEntityCopyWithImpl<$Res>
    implements _$OrderItemEntityCopyWith<$Res> {
  __$OrderItemEntityCopyWithImpl(this._self, this._then);

  final _OrderItemEntity _self;
  final $Res Function(_OrderItemEntity) _then;

/// Create a copy of OrderItemEntity
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? productId = null,Object? productName = null,Object? quantity = null,Object? price = null,Object? addons = null,}) {
  return _then(_OrderItemEntity(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,productId: null == productId ? _self.productId : productId // ignore: cast_nullable_to_non_nullable
as String,productName: null == productName ? _self.productName : productName // ignore: cast_nullable_to_non_nullable
as String,quantity: null == quantity ? _self.quantity : quantity // ignore: cast_nullable_to_non_nullable
as int,price: null == price ? _self.price : price // ignore: cast_nullable_to_non_nullable
as double,addons: null == addons ? _self._addons : addons // ignore: cast_nullable_to_non_nullable
as List<Map<String, dynamic>>,
  ));
}


}

/// @nodoc
mixin _$OrderEntity {

 String get id; String get restaurantId; String? get branchId; String get orderNumber; String get status; double get totalPrice; DateTime get createdAt; String get paymentMethod; String? get customerName; String? get customerPhone; String? get customerAddress; String? get notes; List<OrderItemEntity> get items;
/// Create a copy of OrderEntity
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$OrderEntityCopyWith<OrderEntity> get copyWith => _$OrderEntityCopyWithImpl<OrderEntity>(this as OrderEntity, _$identity);



@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is OrderEntity&&(identical(other.id, id) || other.id == id)&&(identical(other.restaurantId, restaurantId) || other.restaurantId == restaurantId)&&(identical(other.branchId, branchId) || other.branchId == branchId)&&(identical(other.orderNumber, orderNumber) || other.orderNumber == orderNumber)&&(identical(other.status, status) || other.status == status)&&(identical(other.totalPrice, totalPrice) || other.totalPrice == totalPrice)&&(identical(other.createdAt, createdAt) || other.createdAt == createdAt)&&(identical(other.paymentMethod, paymentMethod) || other.paymentMethod == paymentMethod)&&(identical(other.customerName, customerName) || other.customerName == customerName)&&(identical(other.customerPhone, customerPhone) || other.customerPhone == customerPhone)&&(identical(other.customerAddress, customerAddress) || other.customerAddress == customerAddress)&&(identical(other.notes, notes) || other.notes == notes)&&const DeepCollectionEquality().equals(other.items, items));
}


@override
int get hashCode => Object.hash(runtimeType,id,restaurantId,branchId,orderNumber,status,totalPrice,createdAt,paymentMethod,customerName,customerPhone,customerAddress,notes,const DeepCollectionEquality().hash(items));

@override
String toString() {
  return 'OrderEntity(id: $id, restaurantId: $restaurantId, branchId: $branchId, orderNumber: $orderNumber, status: $status, totalPrice: $totalPrice, createdAt: $createdAt, paymentMethod: $paymentMethod, customerName: $customerName, customerPhone: $customerPhone, customerAddress: $customerAddress, notes: $notes, items: $items)';
}


}

/// @nodoc
abstract mixin class $OrderEntityCopyWith<$Res>  {
  factory $OrderEntityCopyWith(OrderEntity value, $Res Function(OrderEntity) _then) = _$OrderEntityCopyWithImpl;
@useResult
$Res call({
 String id, String restaurantId, String? branchId, String orderNumber, String status, double totalPrice, DateTime createdAt, String paymentMethod, String? customerName, String? customerPhone, String? customerAddress, String? notes, List<OrderItemEntity> items
});




}
/// @nodoc
class _$OrderEntityCopyWithImpl<$Res>
    implements $OrderEntityCopyWith<$Res> {
  _$OrderEntityCopyWithImpl(this._self, this._then);

  final OrderEntity _self;
  final $Res Function(OrderEntity) _then;

/// Create a copy of OrderEntity
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? restaurantId = null,Object? branchId = freezed,Object? orderNumber = null,Object? status = null,Object? totalPrice = null,Object? createdAt = null,Object? paymentMethod = null,Object? customerName = freezed,Object? customerPhone = freezed,Object? customerAddress = freezed,Object? notes = freezed,Object? items = null,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,restaurantId: null == restaurantId ? _self.restaurantId : restaurantId // ignore: cast_nullable_to_non_nullable
as String,branchId: freezed == branchId ? _self.branchId : branchId // ignore: cast_nullable_to_non_nullable
as String?,orderNumber: null == orderNumber ? _self.orderNumber : orderNumber // ignore: cast_nullable_to_non_nullable
as String,status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as String,totalPrice: null == totalPrice ? _self.totalPrice : totalPrice // ignore: cast_nullable_to_non_nullable
as double,createdAt: null == createdAt ? _self.createdAt : createdAt // ignore: cast_nullable_to_non_nullable
as DateTime,paymentMethod: null == paymentMethod ? _self.paymentMethod : paymentMethod // ignore: cast_nullable_to_non_nullable
as String,customerName: freezed == customerName ? _self.customerName : customerName // ignore: cast_nullable_to_non_nullable
as String?,customerPhone: freezed == customerPhone ? _self.customerPhone : customerPhone // ignore: cast_nullable_to_non_nullable
as String?,customerAddress: freezed == customerAddress ? _self.customerAddress : customerAddress // ignore: cast_nullable_to_non_nullable
as String?,notes: freezed == notes ? _self.notes : notes // ignore: cast_nullable_to_non_nullable
as String?,items: null == items ? _self.items : items // ignore: cast_nullable_to_non_nullable
as List<OrderItemEntity>,
  ));
}

}


/// Adds pattern-matching-related methods to [OrderEntity].
extension OrderEntityPatterns on OrderEntity {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _OrderEntity value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _OrderEntity() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _OrderEntity value)  $default,){
final _that = this;
switch (_that) {
case _OrderEntity():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _OrderEntity value)?  $default,){
final _that = this;
switch (_that) {
case _OrderEntity() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String restaurantId,  String? branchId,  String orderNumber,  String status,  double totalPrice,  DateTime createdAt,  String paymentMethod,  String? customerName,  String? customerPhone,  String? customerAddress,  String? notes,  List<OrderItemEntity> items)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _OrderEntity() when $default != null:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String restaurantId,  String? branchId,  String orderNumber,  String status,  double totalPrice,  DateTime createdAt,  String paymentMethod,  String? customerName,  String? customerPhone,  String? customerAddress,  String? notes,  List<OrderItemEntity> items)  $default,) {final _that = this;
switch (_that) {
case _OrderEntity():
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String restaurantId,  String? branchId,  String orderNumber,  String status,  double totalPrice,  DateTime createdAt,  String paymentMethod,  String? customerName,  String? customerPhone,  String? customerAddress,  String? notes,  List<OrderItemEntity> items)?  $default,) {final _that = this;
switch (_that) {
case _OrderEntity() when $default != null:
return $default(_that.id,_that.restaurantId,_that.branchId,_that.orderNumber,_that.status,_that.totalPrice,_that.createdAt,_that.paymentMethod,_that.customerName,_that.customerPhone,_that.customerAddress,_that.notes,_that.items);case _:
  return null;

}
}

}

/// @nodoc


class _OrderEntity implements OrderEntity {
  const _OrderEntity({required this.id, required this.restaurantId, required this.branchId, required this.orderNumber, required this.status, required this.totalPrice, required this.createdAt, required this.paymentMethod, required this.customerName, required this.customerPhone, required this.customerAddress, required this.notes, required final  List<OrderItemEntity> items}): _items = items;
  

@override final  String id;
@override final  String restaurantId;
@override final  String? branchId;
@override final  String orderNumber;
@override final  String status;
@override final  double totalPrice;
@override final  DateTime createdAt;
@override final  String paymentMethod;
@override final  String? customerName;
@override final  String? customerPhone;
@override final  String? customerAddress;
@override final  String? notes;
 final  List<OrderItemEntity> _items;
@override List<OrderItemEntity> get items {
  if (_items is EqualUnmodifiableListView) return _items;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_items);
}


/// Create a copy of OrderEntity
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$OrderEntityCopyWith<_OrderEntity> get copyWith => __$OrderEntityCopyWithImpl<_OrderEntity>(this, _$identity);



@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _OrderEntity&&(identical(other.id, id) || other.id == id)&&(identical(other.restaurantId, restaurantId) || other.restaurantId == restaurantId)&&(identical(other.branchId, branchId) || other.branchId == branchId)&&(identical(other.orderNumber, orderNumber) || other.orderNumber == orderNumber)&&(identical(other.status, status) || other.status == status)&&(identical(other.totalPrice, totalPrice) || other.totalPrice == totalPrice)&&(identical(other.createdAt, createdAt) || other.createdAt == createdAt)&&(identical(other.paymentMethod, paymentMethod) || other.paymentMethod == paymentMethod)&&(identical(other.customerName, customerName) || other.customerName == customerName)&&(identical(other.customerPhone, customerPhone) || other.customerPhone == customerPhone)&&(identical(other.customerAddress, customerAddress) || other.customerAddress == customerAddress)&&(identical(other.notes, notes) || other.notes == notes)&&const DeepCollectionEquality().equals(other._items, _items));
}


@override
int get hashCode => Object.hash(runtimeType,id,restaurantId,branchId,orderNumber,status,totalPrice,createdAt,paymentMethod,customerName,customerPhone,customerAddress,notes,const DeepCollectionEquality().hash(_items));

@override
String toString() {
  return 'OrderEntity(id: $id, restaurantId: $restaurantId, branchId: $branchId, orderNumber: $orderNumber, status: $status, totalPrice: $totalPrice, createdAt: $createdAt, paymentMethod: $paymentMethod, customerName: $customerName, customerPhone: $customerPhone, customerAddress: $customerAddress, notes: $notes, items: $items)';
}


}

/// @nodoc
abstract mixin class _$OrderEntityCopyWith<$Res> implements $OrderEntityCopyWith<$Res> {
  factory _$OrderEntityCopyWith(_OrderEntity value, $Res Function(_OrderEntity) _then) = __$OrderEntityCopyWithImpl;
@override @useResult
$Res call({
 String id, String restaurantId, String? branchId, String orderNumber, String status, double totalPrice, DateTime createdAt, String paymentMethod, String? customerName, String? customerPhone, String? customerAddress, String? notes, List<OrderItemEntity> items
});




}
/// @nodoc
class __$OrderEntityCopyWithImpl<$Res>
    implements _$OrderEntityCopyWith<$Res> {
  __$OrderEntityCopyWithImpl(this._self, this._then);

  final _OrderEntity _self;
  final $Res Function(_OrderEntity) _then;

/// Create a copy of OrderEntity
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? restaurantId = null,Object? branchId = freezed,Object? orderNumber = null,Object? status = null,Object? totalPrice = null,Object? createdAt = null,Object? paymentMethod = null,Object? customerName = freezed,Object? customerPhone = freezed,Object? customerAddress = freezed,Object? notes = freezed,Object? items = null,}) {
  return _then(_OrderEntity(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,restaurantId: null == restaurantId ? _self.restaurantId : restaurantId // ignore: cast_nullable_to_non_nullable
as String,branchId: freezed == branchId ? _self.branchId : branchId // ignore: cast_nullable_to_non_nullable
as String?,orderNumber: null == orderNumber ? _self.orderNumber : orderNumber // ignore: cast_nullable_to_non_nullable
as String,status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as String,totalPrice: null == totalPrice ? _self.totalPrice : totalPrice // ignore: cast_nullable_to_non_nullable
as double,createdAt: null == createdAt ? _self.createdAt : createdAt // ignore: cast_nullable_to_non_nullable
as DateTime,paymentMethod: null == paymentMethod ? _self.paymentMethod : paymentMethod // ignore: cast_nullable_to_non_nullable
as String,customerName: freezed == customerName ? _self.customerName : customerName // ignore: cast_nullable_to_non_nullable
as String?,customerPhone: freezed == customerPhone ? _self.customerPhone : customerPhone // ignore: cast_nullable_to_non_nullable
as String?,customerAddress: freezed == customerAddress ? _self.customerAddress : customerAddress // ignore: cast_nullable_to_non_nullable
as String?,notes: freezed == notes ? _self.notes : notes // ignore: cast_nullable_to_non_nullable
as String?,items: null == items ? _self._items : items // ignore: cast_nullable_to_non_nullable
as List<OrderItemEntity>,
  ));
}


}

// dart format on
