class RegistrationsController < Devise::RegistrationsController

	def new
		build_resource({})
		resource.build_org
		yield resource if block_given?
		respond_with resource
	end


  private

	  def sign_up_params
	    #params.require(:user).permit(:name, :org_name, :org_id, :email, :password, :password_confirmation)
	    params.require(:user).permit!
	  end

	  def account_update_params
	    params.require(:user).permit(:name, :org_name, :org_id, :email, :password, :password_confirmation, :current_password)
	  end

end
