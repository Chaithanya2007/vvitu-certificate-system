export type UserRole = 'student' | 'department_approver' | 'registrar' | 'admin';

export interface UserProfile {
  id: string;
  role: UserRole;
  display_name: string;
  designation: string | null;
  is_active: boolean;
}

export interface ClassSection {
  id: string;
  section_code: string;
  department: string;
  program: string;
  academic_year: string;
  room_no: string | null;
  class_teacher: string | null;
  teacher_phone: string | null;
  is_active: boolean;
}

export interface StudentRecord {
  id: string;
  user_id: string | null;
  roll_number: string;
  hall_ticket_no: string | null;
  full_name: string;
  class_id: string;
  program: string;
  seat_type: string | null;
  enrollment_status: 'Active' | 'Graduated' | 'Discontinued';
  is_account_activated: boolean;
  data_warnings: string | null;
  classes?: ClassSection;
}

export interface CertificateType {
  id: string;
  code: string;
  name: string;
  description: string;
  required_fields: {
    name: string;
    label: string;
    type: 'text' | 'select' | 'textarea';
    options?: string[];
    default?: string;
  }[];
  eligible_statuses: string[];
  is_active: boolean;
}

export interface CertificateTemplate {
  id: string;
  certificate_type_id: string;
  version: number;
  title_text: string;
  body_template: string;
  signatory_title: string;
  is_demo_template: boolean;
  is_active: boolean;
}

export interface CertificateRequest {
  id: string;
  tracking_number: string;
  student_id: string;
  certificate_type_id: string;
  purpose: string;
  form_data: Record<string, string>;
  status: 'Submitted' | 'Under Review' | 'Approved' | 'Rejected' | 'Issued';
  admin_remarks: string | null;
  submitted_at: string;
  updated_at: string;
  students?: StudentRecord;
  certificate_types?: CertificateType;
}

export interface IssuedCertificate {
  id: string;
  certificate_number: string;
  verification_token: string;
  request_id: string;
  student_id: string;
  certificate_type_id: string;
  template_id: string;
  status: 'active' | 'revoked' | 'replaced';
  pdf_storage_path: string | null;
  issued_by: string;
  issued_at: string;
  revoked_at: string | null;
  revocation_reason: string | null;
  replaced_by_cert_id: string | null;
  students?: StudentRecord;
  certificate_types?: CertificateType;
}
