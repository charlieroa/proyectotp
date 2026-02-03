class UserModel {
  final String id;
  final String firstName;
  final String lastName;
  final String email;
  final String? phone;
  final String tenantId;
  final int roleId;
  final double? commissionRate;
  final String? token;

  UserModel({
    required this.id,
    required this.firstName,
    required this.lastName,
    required this.email,
    this.phone,
    required this.tenantId,
    required this.roleId,
    this.commissionRate,
    this.token,
  });

  String get fullName => '$firstName $lastName'.trim();

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id'] ?? '',
      firstName: json['first_name'] ?? '',
      lastName: json['last_name'] ?? '',
      email: json['email'] ?? '',
      phone: json['phone'],
      tenantId: json['tenant_id'] ?? '',
      roleId: json['role_id'] ?? 0,
      commissionRate: json['commission_rate'] != null
          ? double.tryParse(json['commission_rate'].toString())
          : null,
      token: json['token'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'first_name': firstName,
      'last_name': lastName,
      'email': email,
      'phone': phone,
      'tenant_id': tenantId,
      'role_id': roleId,
      'commission_rate': commissionRate,
      'token': token,
    };
  }
}
