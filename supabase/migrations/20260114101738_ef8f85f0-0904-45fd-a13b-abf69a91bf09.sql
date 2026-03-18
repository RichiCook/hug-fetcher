-- Create trigger to auto-assign admin role on user creation
CREATE TRIGGER on_auth_user_created_assign_admin
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_admin_role();

-- Manually assign admin role to your existing user
INSERT INTO public.user_roles (user_id, role)
VALUES ('e275e135-d305-4412-b03f-afeb08c7e552', 'admin');