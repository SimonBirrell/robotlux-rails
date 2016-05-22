class UsersController < Devise::RegistrationsController
  before_action :authenticate_user!
  before_action :admin_only, :except => [:show, :my_data]

  def index
    if current_user.admin?
      @users = User.no_agents
    elsif current_user.org_admin?
      @users = User.where(org_id: current_user.org_id).no_agents
    else
      @users = Array(current_user)
    end
  end

  def show
    @user = User.find(params[:id])
    unless current_user.admin?
      unless @user == current_user
        redirect_to :back, :alert => "Access denied."
      end
    end

  end

  def update
    @user = User.find(params[:id])
    if @user.update_attributes(secure_params)
      redirect_to users_path, :notice => "User updated."
    else
      redirect_to users_path, :alert => "Unable to update user."
    end
  end

  def destroy
    user = User.find(params[:id])
    user.destroy
    redirect_to users_path, :notice => "User deleted."
  end

  def my_data
    puts "my_data"
    respond_to do |format|
      puts "doing format"
      format.json do
        puts "json"
        if user_signed_in?
          puts "user signed in"
          user_data = { user: 
                          { email: current_user.email, 
                            auth_token: current_user.authentication_token, 
                            org_id: current_user.org_id,
                            org_slug: current_user.org.slug 
                          } 
                        }
          puts user_data.inspect              
          render json: user_data
        else
          puts "user not signed in"
          render json: [], status: :unauthorized
        end
      end
    end
  end

  def after_update_path_for(resource)
    signed_in_root_path(resource)
  end

  private

    def admin_only
      # unless current_user.admin?
      #   redirect_to :back, :alert => "Access denied."
      # end
    end

    def secure_params
      params.require(:user).permit(:role)
    end

end
