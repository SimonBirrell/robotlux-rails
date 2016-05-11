module Api
  module V1

    class AgentsController < Api::V1::ApiController
      before_action :set_agent, only: [:update]
      before_action :authenticate_user!

      # POST /agents
      # POST /agents.json
      def create
        @org = Org.find(params[:org_id])
        @agent = Agent.new(agent_params.merge(org: @org))

        respond_to do |format|
          if (current_user.org.id == @org.id) && @agent.save
            agent_description = @agent.attributes
            agent_description['password'] = @agent.password
            format.json { render json: agent_description.to_json, status: :created, location: @agent}
          elsif current_user.org.id != @org.id
            format.json { render json: @agent.errors, status: :unauthorized }
          else
            format.json { render json: @agent.errors, status: :unprocessable_entity }
          end
        end

      end

      # PATCH/PUT /agents/1
      # PATCH/PUT /agents/1.json
      def update
        @org = Org.find(params[:org_id])        
        respond_to do |format|
          if (current_user.org.id == @org.id) && @agent.update(agent_params)
            agent_description = @agent.attributes
            agent_description['password'] = @agent.change_password
            format.json { render json: agent_description.to_json, status: :created, location: @agent}
          elsif current_user.org.id != @org.id
            format.json { render json: @agent.errors, status: :unauthorized }
          else
            format.json { render json: @agent.errors, status: :unprocessable_entity }
          end
        end
      end

      private
        # Use callbacks to share common setup or constraints between actions.
        def set_agent
          @agent = Agent.find(params[:id])
        end

        # Never trust parameters from the scary internet, only allow the white list through.
        def agent_params
          params.require(:agent).permit(:name, :slug, :org_id, :guid, :hostname, :ros_master_uri, :network, :authorization)
        end
    end

  end
end