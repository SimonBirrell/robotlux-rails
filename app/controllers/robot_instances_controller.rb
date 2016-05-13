class RobotInstancesController < ApplicationController
  before_action :set_robot_instance, only: [:show, :edit, :update, :destroy]

  # GET /robot_instances
  # GET /robot_instances.json
  def index
    @robot_instances = RobotInstance.all
  end

  # GET /robot_instances/1
  # GET /robot_instances/1.json
  def show
  end

  # GET /robot_instances/new
  def new
    @robot_instance = RobotInstance.new
  end

  # GET /robot_instances/1/edit
  def edit
  end

  # POST /robot_instances
  # POST /robot_instances.json
  def create
    @robot_instance = RobotInstance.new(robot_instance_params)

    respond_to do |format|
      if @robot_instance.save
        format.html { redirect_to @robot_instance, notice: 'Robot instance was successfully created.' }
        format.json { render :show, status: :created, location: @robot_instance }
      else
        format.html { render :new }
        format.json { render json: @robot_instance.errors, status: :unprocessable_entity }
      end
    end
  end

  # PATCH/PUT /robot_instances/1
  # PATCH/PUT /robot_instances/1.json
  def update
    respond_to do |format|
      if @robot_instance.update(robot_instance_params)
        format.html { redirect_to @robot_instance, notice: 'Robot instance was successfully updated.' }
        format.json { render :show, status: :ok, location: @robot_instance }
      else
        format.html { render :edit }
        format.json { render json: @robot_instance.errors, status: :unprocessable_entity }
      end
    end
  end

  # DELETE /robot_instances/1
  # DELETE /robot_instances/1.json
  def destroy
    @robot_instance.destroy
    respond_to do |format|
      format.html { redirect_to robot_instances_url, notice: 'Robot instance was successfully destroyed.' }
      format.json { head :no_content }
    end
  end

  private
    # Use callbacks to share common setup or constraints between actions.
    def set_robot_instance
      @robot_instance = RobotInstance.find(params[:id])
    end

    # Never trust parameters from the scary internet, only allow the white list through.
    def robot_instance_params
      params.require(:robot_instance).permit(:name, :org_id, :network, :master_key, :launch_command)
    end
end
