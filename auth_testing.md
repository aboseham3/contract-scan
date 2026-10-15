# Auth testing
Email auth: POST /api/auth/register {email,password,name} -> {token}; use Authorization: Bearer <token>.
Google auth (Emergent): create test user+session in mongo:
mongosh --eval "use('test_database'); var id='test-user-'+Date.now(); var tok='test_session_'+Date.now(); db.users.insertOne({user_id:id,email:'test.user.'+Date.now()+'@example.com',name:'Test User',auth_provider:'google',free_used:false,subscription_active:false,subscription_credits:0,single_credits:0,created_at:new Date().toISOString()}); db.user_sessions.insertOne({user_id:id,session_token:tok,expires_at:new Date(Date.now()+7*864e5).toISOString(),created_at:new Date().toISOString()}); print(tok)"
Then set cookie session_token=<tok> (secure, sameSite None) on the app domain.
