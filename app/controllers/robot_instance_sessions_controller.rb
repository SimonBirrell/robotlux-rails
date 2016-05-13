class RobotInstanceSessionsController < ApplicationController
  before_action :set_robot_instance_session, only: [:show, :edit, :update, :destroy]

  # GET /robot_instance_sessions
  # GET /robot_instance_sessions.json
  def index
    @robot_instance_sessions = RobotInstanceSession.all
  end

  # GET /robot_instance_sessions/1
  # GET /robot_instance_sessions/1.json
  def show
  end

  # GET /robot_instance_sessions/new
  def new
    @robot_instance_session = RobotInstanceSession.new
  end

  # GET /robot_instance_sessions/1/edit
  def edit
  end

  # POST /robot_instance_sessions
  # POST /robot_instance_sessions.json
  def create
    @robot_instance_session = RobotInstanceSession.new(robot_instance_session_params)

    respond_to do |format|
      if @robot_instance_session.save
        format.html { redirect_to @robot_instance_session, notice: 'Robot instance session was successfully created.' }
        format.json { render :show, status: :created, location: @robot_instance_session }
      else
        format.html { render :new }
        format.json { render json: @robot_instance_session.errors, status: :unprocessable_entity }
      end
    end
  end

  # PATCH/PUT /robot_instance_sessions/1
  # PATCH/PUT /robot_instance_sessions/1.json
  def update
    respond_to do |format|
      if @robot_instance_session.update(robot_instance_session_params)
        format.html { redirect_to @robot_instance_session, notice: 'Robot instance session was successfully updated.' }
        format.json { render :show, status: :ok, location: @robot_instance_session }
      else
        format.html { render :edit }
        format.json { render json: @robot_instance_session.errors, status: :unprocessable_entity }
      end
    end
  end

  # DELETE /robot_instance_sessions/1
  # DELETE /robot_instance_sessions/1.json
  def destroy
    @robot_instance_session.destroy
    respond_to do |format|
      format.html { redirect_to robot_instance_sessions_url, notice: 'Robot instance session was successfully destroyed.' }
      format.json { head :no_content }
    end
  end

  private
    # Use callbacks to share common setup or constraints between actions.
    def set_robot_instance_session
      @robot_instance_session = RobotInstanceSession.find(params[:id])
    end

    # Never trust parameters from the scary internet, only allow the white list through.
    def robot_instance_session_params
      params.require(:robot_instance_session).permit(:name, :robot_instance_id, :start_session, :end_session, :session_token)
    end
end
