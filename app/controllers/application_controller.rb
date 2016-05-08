class ApplicationController < ActionController::Base
    protect_from_forgery with: :exception

    layout :layout_by_resource

    # API authentication
    # http://soryy.com/blog/2014/apis-with-devise/
    protect_from_forgery with: :null_session, :if => Proc.new { |c| c.request.format == 'application/json'}
    before_filter :authenticate_user_from_token!
    # before_filter :authenticate_user!

    protected

    def layout_by_resource
      if devise_controller? && resource_name == :user && action_name == "new"
        "lock_screen"
      else
        "application"
      end
    end
    

    def authenticate_user_from_token!
      user_email = request.headers["X-API-EMAIL"].presence
      user_auth_token = request.headers["X-API-TOKEN"].presence
      user = user_email && User.find_by_email(user_email)

      # Notice how we use Devise.secure_compare to compare the token
      # in the database with the token given in the params, mitigating
      # timing attacks.
      if user && Devise.secure_compare(user.authentication_token, user_auth_token)
        sign_in(user, store: false)
      end
    end

end
