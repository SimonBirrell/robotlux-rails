class OrgsController < ApplicationController
  before_action :set_org, only: [:show, :edit, :update, :destroy, :agents_info]
  before_action :authenticate_user!

  # GET /orgs
  # GET /orgs.json
  def index
    if current_user.admin?
      @orgs = Org.all
    else
      @orgs = Array(current_user.org)
    end
  end

  # GET /orgs/1
  # GET /orgs/1.json
  def show
    @users = @org.users.no_agents
    @agents = @org.agents
    @robot_instances = @org.robot_instances
  end

  # GET /orgs/new
  def new
    @org = Org.new
  end

  # GET /orgs/1/edit
  def edit
  end

  # POST /orgs
  # POST /orgs.json
  def create
    @org = Org.new(org_params)

    respond_to do |format|
      if @org.save
        format.html { redirect_to @org, notice: 'Org was successfully created.' }
        format.json { render :show, status: :created, location: @org }
      else
        format.html { render :new }
        format.json { render json: @org.errors, status: :unprocessable_entity }
      end
    end
  end

  # PATCH/PUT /orgs/1
  # PATCH/PUT /orgs/1.json
  def update
    respond_to do |format|
      if @org.update(org_params)
        format.html { redirect_to @org, notice: 'Org was successfully updated.' }
        format.json { render :show, status: :ok, location: @org }
      else
        format.html { render :edit }
        format.json { render json: @org.errors, status: :unprocessable_entity }
      end
    end
  end

  # DELETE /orgs/1
  # DELETE /orgs/1.json
  def destroy
    @org.destroy
    respond_to do |format|
      format.html { redirect_to orgs_url, notice: 'Org was successfully destroyed.' }
      format.json { head :no_content }
    end
  end

  # # API
  # # GET /org/1/agents_info.json
  # def agents_info
  #   respond_to do |format|
  #      format.json { render json: @org}
  #   end    
  # end

  private
    # Use callbacks to share common setup or constraints between actions.
    def set_org
      @org = Org.find(params[:id])
    end

    # Never trust parameters from the scary internet, only allow the white list through.
    def org_params
      params.require(:org).permit(:name, :slug)
    end
end
