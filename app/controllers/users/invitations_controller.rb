class Users::InvitationsController < Devise::InvitationsController
	before_filter :configure_permitted_parameters, if: :devise_controller?

	def create
		params[:user][:org_id] = current_user.org_id
		super
	end

	def update
		params[:user][:org_id] = current_user.org_id
		super
	end

	protected

		# https://github.com/scambra/devise_invitable
		def configure_permitted_parameters
		  # Only add some parameters
		  devise_parameter_sanitizer.for(:invite).concat [:name, :org_id]

		  # Override accepted parameters
		  devise_parameter_sanitizer.for(:accept_invitation) do |u|
		    u.permit(:name, :org_id, :password, :password_confirmation,
		             :invitation_token)
		  end
		end

		def invite_params
			puts "invite_params"
		    devise_parameter_sanitizer.sanitize(:invite) 
		    params.require(:user).permit(:name, :org_id, :email, :password, :password_confirmation).tap do |user_params|
		    	user_params.require(:name)
		    end
  		end

end

