module Api
  module V1
    class SessionsController < Devise::SessionsController  
        # http://blog.andrewray.me/how-to-set-up-devise-ajax-authentication-with-rails-4-0/
        respond_to :json

        # http://stackoverflow.com/questions/4673027/how-do-you-use-curl-to-authenticate-on-a-rails-application-that-uses-devise
    	#skip_before_filter :verify_authenticity_token

    	# Test with curl
    	# curl -XPOST -v http://localhost:3000/users/sign_in 
    	#   -d '{"email": "user@gmail.com", "password": "secret"}' 
    	#   -H 'Content-Type: application/json'  -H 'Accept: application/json'
    	#
    	# Returns something like
    	# {
    	#	"user":{
    	#		"email":"user@gmail.com",
    	#		"auth_token":"blahblahblah"}
    	#	}
    	#	
    	# Then use
    	# curl -XGET -v http://localhost:3000/api/v1/orgs/1/agents_info 
    	# -H 'Content-Type: application/json' -H 'Accept: application/json' 
    	# -H 'X-API-EMAIL: user@gmail.com' 
    	# -H 'X-API-TOKEN: blahblahblah' 

    	# Also see http://soryy.com/blog/2014/apis-with-devise/

    	# # http://soryy.com/blog/2014/apis-with-devise/
    	skip_before_filter :authenticate_user!, :only => [:create, :new]

    	# CanCan
     	# skip_authorization_check only: [:create, :failure, :show_current_user, :options, :new]

        def new
        	self.resource = resource_class.new(sign_in_params)
        	clean_up_passwords(resource)
        	respond_with(resource, serialize_options(resource))
        end

        def create

          respond_to do |format|
            format.html {
              super
            }
            format.json {

              resource = resource_from_credentials
              #build_resource
              return invalid_login_attempt unless resource

              if resource.valid_password?(params[:password])
                render :json => { user: { email: resource.email, :auth_token => resource.authentication_token, org_id: resource.org_id } }, success: true, status: :created
              else
                invalid_login_attempt
              end
            }
          end
        end

        def destroy
          respond_to do |format|
            format.html {
              super
            }
            format.json {
              user = User.find_by_authentication_token(request.headers['X-API-TOKEN'])
              if user
                user.reset_authentication_token!
                render :json => { :message => 'Session deleted.' }, :success => true, :status => 204
              else
                render :json => { :message => 'Invalid token.' }, :status => 404
              end
            }
          end
        end

        protected

        def invalid_login_attempt
        	warden.custom_failure!
        	render json: { success: false, message: 'Error with your login or password' }, status: 401
        end

        def resource_from_credentials
        	data = { email: params[:email] }
        	if res = resource_class.find_for_database_authentication(data)
        		if res.valid_password?(params[:password])
              		res
            	end
        	end
        end

    end  
  end
end

